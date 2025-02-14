"use client"

import FileSystemBrowser from "../components/FileSystemBrowser";
import { ApplyChangesForm } from "../components/apply-changes-form";
import LLMChatbox from "../components/LLMChatbox";
import { Card, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { useState } from "react";

export default function HomePage() {

  const [messages, setMessages] = useState([]); //keep messages
  const [isLoading, setIsLoading] = useState(false); //keep isloading

  const handleNewChat = () => { //new chat handler
    setMessages([]);
    setIsLoading(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <FileSystemBrowser />

      <Card className="w-[90%] max-w-3xl mt-4">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">LLM XML Parser</CardTitle>
        </CardHeader>
        <ApplyChangesForm />
      </Card>

      <Card className="w-[90%] max-w-3xl mt-4">
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle className="text-2xl font-bold text-center">LLM Chatbox</CardTitle>
            <Button variant="destructive" onClick={handleNewChat}>New Chat</Button> {/* Use handleNewChat */}
          </div>
        </CardHeader>
        <LLMChatbox messages={messages} setMessages={setMessages} isLoading={isLoading} setIsLoading={setIsLoading}/>
      </Card>
    </main>
  );
}