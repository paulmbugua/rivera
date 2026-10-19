import type { Campaign } from './campaigns';

// Owner responses contain database fields which the draft endpoint must not receive.
export function campaignDraftFields<T extends object>(defaults:T,campaign:Campaign):T {
  const fields=Object.fromEntries(Object.entries(defaults).map(([key,fallback])=>[key,campaign[key as keyof Campaign]??fallback]));
  return {...fields,
    categoryIds:campaign.categories.map(item=>item.categoryId??item.category?.id??item.id),
    creatorLocations:campaign.creatorLocations.map(({countryCode,city})=>({countryCode,city})),
    platforms:campaign.platforms.map(({platform,required,minimumFollowers,preferredFollowers})=>({platform,required,minimumFollowers:minimumFollowers??undefined,preferredFollowers:preferredFollowers??undefined})),
    languages:campaign.languages.map(({languageCode,required})=>({languageCode,required})),
    deliverables:campaign.deliverables.map(({title,description,quantity,platform,contentTypeId,dueDate})=>({title,description:description??'',quantity,platform:platform??undefined,contentTypeId:contentTypeId??undefined,dueDate:dueDate?.slice(0,10)})),
    applicationDeadline:campaign.applicationDeadline?.slice(0,10)??'',
    campaignStartDate:campaign.campaignStartDate?.slice(0,10)??'',
    campaignEndDate:campaign.campaignEndDate?.slice(0,10)??'',
  } as T;
}

export function campaignSelectionsSaved(submitted:{categoryIds:string[];deliverables:{title:string;quantity:number;platform?:string}[]},saved:Campaign):boolean {
  const categoryIds=saved.categories.map(item=>item.categoryId??item.category?.id??item.id);
  return categoryIds.length===submitted.categoryIds.length&&submitted.categoryIds.every(id=>categoryIds.includes(id))
    &&saved.deliverables.length===submitted.deliverables.length&&submitted.deliverables.every((item,index)=>{
      const actual=saved.deliverables[index];
      return actual.title===item.title&&actual.quantity===item.quantity&&(actual.platform??undefined)===item.platform;
    });
}
