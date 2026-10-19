import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { MarketplacePaymentService } from './marketplace-payment.service';

@Injectable()
export class PayoutWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running=false;
  private readonly log=new Logger(PayoutWorker.name);
  constructor(private db:PrismaService,private payments:MarketplacePaymentService){}
  onModuleInit(){
    if(process.env.JOBS_ENABLED!=='true'||process.env.PAYOUT_WORKER_ENABLED==='false')return;
    const tick=()=>void this.run().catch(()=>this.log.error(JSON.stringify({job:'WEEKLY_PAYOUTS',outcome:'failed'})));
    this.timer=setInterval(tick,60_000);this.timer.unref();tick();
  }
  onModuleDestroy(){if(this.timer)clearInterval(this.timer);}
  async run(now=new Date()){
    if(this.running)return;
    this.running=true;
    try{
      // Old records have no scheduledFor: never automatically replay historical transfers.
      const rows=await this.db.creatorTransfer.findMany({where:{scheduledFor:{lte:now},OR:[{status:'SCHEDULED'},{status:'PROCESSING',provider:{not:'WISE'}}],
        AND:[{OR:[{lastCheckedAt:null},{lastCheckedAt:{lte:new Date(now.getTime()-5*60_000)}}]}]},select:{id:true},orderBy:[{lastCheckedAt:{sort:'asc',nulls:'first'}},{scheduledFor:'asc'}],take:50});
      let failed=0;
      for(const row of rows){try{await this.payments.dispatchScheduledPayout(row.id,now);}catch{failed++;this.log.warn(JSON.stringify({job:'WEEKLY_PAYOUTS',transferId:row.id,outcome:'deferred'}));}}
      if(rows.length){
        await this.db.operationalJobRun.create({data:{jobName:'WEEKLY_PAYOUTS',scheduledFor:now,status:failed?'FAILED':'SUCCEEDED',processed:rows.length-failed,failed,finishedAt:new Date()}}).catch(()=>undefined);
        this.log.log(JSON.stringify({job:'WEEKLY_PAYOUTS',checked:rows.length,failed}));
      }
    }finally{this.running=false;}
  }
}
