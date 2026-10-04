"use client";
import { Workspace, Card, buttonClass } from "@/components/LmsUi";
export default function AdminError({ reset }: { reset: () => void }) { return <Workspace title="Unable to load this page" description="The request could not be completed. Your saved data has not been changed."><Card><button className={buttonClass} onClick={reset}>Try Again</button></Card></Workspace>; }
