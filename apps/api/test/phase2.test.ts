import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from 'class-validator';
import { hash } from 'bcryptjs';
import { AuthService } from '../src/auth/auth.service';
import { RegisterDto } from '../src/auth/dto';
import { MailProvider, MailService } from '../src/auth/mail.service';
import { PrismaService } from '../src/common/prisma.service';

const codeOf = (error: unknown) => (error as { getResponse?:()=>unknown }).getResponse?.() as {code?:string};
const serviceWithUser = async (overrides:Record<string,unknown>={}) => {
  const user={id:'user-1',email:'person@example.com',firstName:'A',lastName:'B',passwordHash:await hash('CorrectPassword123',4),status:'ACTIVE',deletedAt:null,emailVerifiedAt:new Date(),roles:[{role:'CREATOR'}],business:null,creator:{onboardingCompleted:false},...overrides};
  const db={user:{findUnique:async()=>user,update:async({data}:{data:Record<string,unknown>})=>({...user,...data}),findUniqueOrThrow:async()=>user},refreshSession:{create:async()=>({id:'session-1'}),updateMany:async()=>({count:1})}};
  return new AuthService(db as unknown as PrismaService,{} as MailService);
};

test('registration DTO requires strong password and terms acceptance',async()=>{
  const dto=Object.assign(new RegisterDto(),{firstName:'A',lastName:'B',email:'a@example.com',password:'alllowercase12',accountType:'CREATOR',termsAccepted:false});
  const errors=await validate(dto);
  assert.ok(errors.some(error=>error.property==='password'));
  assert.ok(errors.some(error=>error.property==='termsAccepted'));
});

test('registration DTO accepts a balanced password and accepted terms',async()=>{
  const dto=Object.assign(new RegisterDto(),{firstName:'A',lastName:'B',email:'a@example.com',password:'BalancedPass123',accountType:'CREATOR',termsAccepted:true});
  assert.equal((await validate(dto)).length,0);
});

test('duplicate registration returns EMAIL_ALREADY_REGISTERED',async()=>{
  const db={user:{findUnique:async()=>({id:'existing'})}};
  const service=new AuthService(db as unknown as PrismaService,{} as MailService);
  await assert.rejects(service.register({firstName:'A',lastName:'B',email:'a@example.com',password:'BalancedPass123',accountType:'CREATOR',termsAccepted:true}),error=>codeOf(error).code==='EMAIL_ALREADY_REGISTERED');
});

test('suspended login returns ACCOUNT_SUSPENDED',async()=>{
  const service=await serviceWithUser({status:'SUSPENDED'});
  await assert.rejects(service.login({email:'person@example.com',password:'CorrectPassword123'}),error=>codeOf(error).code==='ACCOUNT_SUSPENDED');
});

test('deactivated login returns ACCOUNT_DEACTIVATED',async()=>{
  const service=await serviceWithUser({status:'DEACTIVATED',deletedAt:new Date()});
  await assert.rejects(service.login({email:'person@example.com',password:'CorrectPassword123'}),error=>codeOf(error).code==='ACCOUNT_DEACTIVATED');
});

test('unverified login returns EMAIL_NOT_VERIFIED',async()=>{
  const service=await serviceWithUser({emailVerifiedAt:null});
  await assert.rejects(service.login({email:'person@example.com',password:'CorrectPassword123'}),error=>codeOf(error).code==='EMAIL_NOT_VERIFIED');
});

test('profile updates normalize ISO country code',async()=>{
  const service=await serviceWithUser();
  const user=await service.updateProfile('user-1',{firstName:'Amina',lastName:'Ali',countryCode:'ke',city:'Nairobi'});
  assert.equal(user.countryCode,'KE');
  assert.equal(user.city,'Nairobi');
});

test('change password rejects mismatched confirmation',async()=>{
  const service=await serviceWithUser();
  await assert.rejects(service.changePassword('user-1',{currentPassword:'CorrectPassword123',newPassword:'AnotherPassword123',confirmPassword:'DifferentPassword123'}),error=>codeOf(error).code==='PASSWORD_CONFIRMATION_MISMATCH');
});

test('forgot password remains neutral for unknown account',async()=>{
  const db={user:{findUnique:async()=>null}};
  const result=await new AuthService(db as unknown as PrismaService,{} as MailService).forgot('missing@example.com');
  assert.match(result.message,/If an account exists/);
});

test('expired reset token returns RESET_TOKEN_EXPIRED',async()=>{
  const db={passwordResetToken:{findUnique:async()=>({id:'r',userId:'u',usedAt:null,expiresAt:new Date(0)})}};
  await assert.rejects(new AuthService(db as unknown as PrismaService,{} as MailService).reset({token:'expired',password:'BalancedPass123'}),error=>codeOf(error).code==='RESET_TOKEN_EXPIRED');
});

test('used verification token returns INVALID_VERIFICATION_TOKEN',async()=>{
  const db={emailVerificationToken:{findUnique:async()=>({id:'v',usedAt:new Date(),expiresAt:new Date(Date.now()+1000)})}};
  await assert.rejects(new AuthService(db as unknown as PrismaService,{} as MailService).verify('used'),error=>codeOf(error).code==='INVALID_VERIFICATION_TOKEN');
});

test('branded mail provider receives HTML and development URL',async()=>{
  const sent:Array<{html:string;developmentUrl?:string}>=[];
  const provider:MailProvider={send:async message=>{sent.push(message)}};
  await new MailService(provider).sendVerificationEmail('a@example.com','token');
  assert.match(sent[0].html,/rivera/i);
  assert.match(sent[0].developmentUrl??'',/verify-email\?token=/);
});
