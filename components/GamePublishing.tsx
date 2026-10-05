"use client";
import ActionIcon from "@/components/ActionIcon";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, secondaryClass } from "./LmsUi";
import { useToast, submitJson } from "./LmsToast";
export default function GamePublishing({ gameId,status }: {gameId:string;status:string}) {
  const [busy,setBusy]=useState(false);const router=useRouter();const {notification,setToast}=useToast();
  async function save(){setBusy(true);try{await submitJson(`/api/admin/games/${gameId}/status`,"PATCH",{status:status==="published"?"draft":"published"});setToast({type:"success",message:status==="published"?"Game unpublished. Existing results are retained.":"Game published and available for Learning Paths."});router.refresh();}catch(e){setToast({type:"error",message:(e as Error).message});}finally{setBusy(false);}}
  return <>{notification}<button disabled={busy} onClick={save} className={status === "published" ? secondaryClass : buttonClass}><ActionIcon name="check" />{busy ? (status === "published" ? "Unpublishing..." : "Publishing...") : status === "published" ? "Unpublish Game" : "Publish Game"}</button></>;
}
