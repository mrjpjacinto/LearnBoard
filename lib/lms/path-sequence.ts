export function assignedSequenceIsPreserved(original:string[], next:string[]) {
 return original.every((id,index)=>next[index]===id);
}
