"use client";
import ActionIcon from "@/components/ActionIcon";

import { Workspace, Card, buttonClass } from "@/components/LmsUi";
export default function StudentError({ reset }: { reset: () => void }) { return <div className="min-h-screen bg-[#F4F7FB]"><Workspace title="Unable to load learning" description="Please try again. If you were playing a game, return to My Learning to resume." back={{ href: "/student", label: "My Learning" }}><Card><button className={buttonClass} onClick={reset}><ActionIcon name="refresh" />Try Again</button></Card></Workspace></div>; }
