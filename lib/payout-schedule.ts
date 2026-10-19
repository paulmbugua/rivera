export function payoutDate(value:string){
  return new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Nairobi',weekday:'short',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value))+' EAT';
}
