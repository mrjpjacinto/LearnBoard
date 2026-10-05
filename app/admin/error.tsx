"use client";
import ActionIcon from "@/components/ActionIcon";

import { Workspace, Card, buttonClass } from "@/components/LmsUi";
export default function AdminError({ reset }: { reset: () => void }) { return <Workspace title="Unable to load this page" description="The request could not be completed. Your saved data has not been changed."><Card><button className={buttonClass} onClick={reset}><ActionIcon name="refresh" />Try Again</button></Card></Workspace>; }
