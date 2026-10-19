import { PrismaClient } from '@prisma/client';
import { seedReferenceData } from './reference-data';

const db=new PrismaClient();
seedReferenceData(db)
  .then(inserted=>console.log(JSON.stringify({event:'REFERENCE_DATA_INITIALIZED',inserted})))
  .catch(()=>{console.error('Reference data initialization failed. Check database connectivity and migrations.');process.exitCode=1})
  .finally(()=>db.$disconnect());
