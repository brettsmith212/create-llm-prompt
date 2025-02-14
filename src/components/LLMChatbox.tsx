"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const LLMChatbox = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedLLM, setSelectedLLM] = useState("gemini");
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSubmit = async () => {
        if (input.trim() === "" || isLoading) return;

        const userMessage: Message = { role: "user", content: input };
        setMessages((prevMessages) => [...prevMessages, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ messages: [...messages, userMessage], llm: selectedLLM }),
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const data = await response.json();
            const assistantMessage: Message = { role: "assistant", content: data.text };
            setMessages((prevMessages) => [...prevMessages, assistantMessage]);

        } catch (error:any) {
            console.error("Error:", error);
            setMessages((prevMessages) => [...prevMessages, { role: "assistant", content: `Error: ${error.message}` }]);

        } finally {
          setIsLoading(false);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };


  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  return (
    <div className="flex flex-col h-[300px]">
      <div className="flex-1 overflow-auto p-4 border-b">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-2 ${
              message.role === "user" ? "text-right" : "text-left"
            }`}
          >
            <span
              className={`inline-block px-3 py-1 rounded-lg ${
                message.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-black"
              }`}
            >
              {message.content}
            </span>
          </div>
        ))}
         {isLoading && (
            <div className="flex items-center justify-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </div>
          )}
      </div>
      <div className="p-4 flex items-start gap-2">
        <Textarea
          ref={textareaRef}
          className="resize-none flex-1"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="flex flex-col gap-2">
          <Select
              value={selectedLLM}
              onValueChange={(value) => setSelectedLLM(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select LLM" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini">Gemini Flash 2.0</SelectItem>
                {/* Future models can be added here */}
              </SelectContent>
            </Select>
            <Button onClick={handleSubmit} disabled={isLoading}>
              Submit
            </Button>
        </div>
      </div>
    </div>
  );
};

export default LLMChatbox;