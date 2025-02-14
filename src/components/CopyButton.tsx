// <ai_context>
// This file defines the CopyButton component, which provides a button to copy text to the clipboard.
// </ai_context>
import { Button } from "./ui/button";
import { Clipboard } from "lucide-react";
import { useState } from "react";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "~/components/ui/tooltip";

interface CopyButtonProps {
  textToCopy: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ textToCopy }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (error) {
      console.error("Failed to copy:", error);
      setCopied(false);
    }
  };

  return (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopy}
                    className="absolute top-2 right-2 hover:bg-gray-600 [&>svg]:hover:stroke-gray-900"
                >
                    <Clipboard className="h-4 w-4 stroke-gray-400" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>{copied ? "Copied!" : "Copy to Clipboard"}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>

  );
};

export default CopyButton;