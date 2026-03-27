"use client";
import dynamic from "next/dynamic";

const SetupInner = dynamic(() => import("./SetupInner"), { ssr: false });

export default function SetupPage() {
  return <SetupInner />;
}
