"use client";
import {
  useState,
  useEffect,
} from "react";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Loader2, RefreshCcw } from "lucide-react";

interface TreeNode {
  path: string;
  name: string;
  type: "file" | "directory";
  children?: TreeNode[];
  selected: boolean;
}

async function generateFileSystemTree(
  handle: FileSystemDirectoryHandle,
  path: string = "",
  initialSelection: string[] = []
): Promise<TreeNode[]> {
  const nodes: TreeNode[] = [];

  try {
    for await (const entry of handle.values()) {
      const entryPath = `${path}/${entry.name}`;

      if (entry.kind === 'directory') {
        const dirHandle = await handle.getDirectoryHandle(entry.name);
        const children = await generateFileSystemTree(dirHandle, entryPath, initialSelection);
        const isSelected = initialSelection.includes(entryPath);
        nodes.push({
          path: entryPath,
          name: entry.name,
          type: "directory",
          children: children,
          selected: isSelected,
        });
      } else {
        const isSelected = initialSelection.includes(entryPath);
        nodes.push({
          path: entryPath,
          name: entry.name,
          type: "file",
          selected: isSelected,
        });
      }
    }
    return nodes;
  } catch (error) {
    console.error("Error generating file system tree:", error);
    return [];
  }
}

interface TreeViewProps {
  tree: TreeNode[];
  onChange: (path: string, selected: boolean) => void;
  expandedFolders: { [path: string]: boolean };
  onToggle: (path: string) => void;
}
const TreeView = ({ tree, onChange, expandedFolders, onToggle }: TreeViewProps) => {
  if (!tree) {
    return null;
  }

  return (
    <ul>
      {tree.map((node) => (
        <li key={node.path}>
          {node.type === "directory" ? (
            <div>
              <label className="flex items-center space-x-2">
                <button onClick={() => onToggle(node.path)} className="mr-2">
                  {expandedFolders[node.path] ? "[-]" : "[+]"}
                </button>
                <Checkbox
                  checked={node.selected}
                  onCheckedChange={(checked) => onChange(node.path, checked)}
                />
                <span>{node.name}</span>
              </label>
              {expandedFolders[node.path] && node.children && (
                <div className="ml-4">
                  <TreeView tree={node.children} onChange={onChange} expandedFolders={expandedFolders} onToggle={onToggle} />
                </div>
              )}
            </div>
          ) : (
            <label className="flex items-center space-x-2">
              <Checkbox
                checked={node.selected}
                onCheckedChange={(checked) => onChange(node.path, checked)}
              />
              <span>{node.name}</span>
            </label>
          )}
        </li>
      ))}
    </ul>
  );
};

const FileSystemBrowser = () => {
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [fileSystemTree, setFileSystemTree] = useState<TreeNode[] | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<{ [path: string]: boolean }>({});
  const [promptFileHandle, setPromptFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [promptFileName, setPromptFileName] = useState<string>("");
  const [promptFileContent, setPromptFileContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedFileForRefresh, setSelectedFileForRefresh] = useState<string | null>(null);

  const handleDirectorySelect = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setIsLoading(true);
      setDirectoryHandle(handle);
      const tree = await generateFileSystemTree(handle);
      setFileSystemTree(tree);
      setExpandedFolders({}); // Reset expanded folders on new directory selection
      setSelectedFileForRefresh(null); // Reset selected file
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // User cancelled the directory selection, do nothing
        console.debug("User aborted directory selection");
      } else {
        console.error("Error selecting directory:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

    const handleClearSelectedFolder = () => {
        setDirectoryHandle(null);
        setFileSystemTree(null);
        setSelectedPaths([]);
        setExpandedFolders({});
        setSelectedFileForRefresh(null); // Reset selected file

    };

  const handleNodeSelectionChange = (path: string, selected: boolean) => {
    function updateNode(node: TreeNode, selected: boolean): TreeNode {
      return { ...node, selected: selected };
    }

    function updateTree(tree: TreeNode[], path: string, selected: boolean): TreeNode[] {
      return tree.map(node => {
        // Update the selected state of the current node
        if (node.path === path || node.path.startsWith(path + '/')) {
          node = updateNode(node, selected);
        }

        // If it's a directory, recursively update all children
        if (node.type === "directory" && node.children) {
          node.children = updateTree(node.children, path, selected);
        }
        return node;
      });
    }

    if (fileSystemTree) {
      const updatedTree = updateTree(fileSystemTree, path, selected);
      setFileSystemTree(updatedTree);

      // Update selected paths state
      const updatedSelectedPaths = updatedTree.reduce((acc: string[], node) => {
        function collectSelectedPaths(node: TreeNode) {
          if (node.selected) {
            acc.push(node.path);
          }
          if (node.type === "directory" && node.children) {
            node.children.forEach(collectSelectedPaths);
          }
        }
        collectSelectedPaths(node);
        return acc;
      }, []);

      setSelectedPaths(updatedSelectedPaths);

      // Update selectedFileForRefresh
      const selectedNode = updatedTree.find(n => n.path === path);
      setSelectedFileForRefresh(selectedNode?.type === 'file' ? path : null);
    }
  };

    const handleToggleFolder = (path: string) => {
        setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }));
    };

  const handlePromptFileSelect = async () => {
    try {
      const [fileHandle] = await window.showOpenFilePicker();
      const file = await fileHandle.getFile();
      const fileContent = await file.text();

      setPromptFileHandle(fileHandle);
      setPromptFileName(file.name);
      setPromptFileContent(fileContent);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
                // User cancelled the file selection, do nothing
                console.debug("User aborted file selection");
            } else {
                console.error("Error selecting prompt file:", error);
            }
    }
  };

    const handleClearPromptFile = () => {
        setPromptFileHandle(null);
        setPromptFileName("");
        setPromptFileContent("");
    };

    const handleRefreshPromptFile = async () => {
        if (!promptFileHandle) return;

        setIsLoading(true);
        try {
            const file = await promptFileHandle.getFile();
            const fileContent = await file.text();
            setPromptFileContent(fileContent);

        } catch (error) {
            console.error("Error refreshing prompt file:", error);
            alert("Error refreshing prompt file.");
        } finally {
            setIsLoading(false);
        }
    }

  const handleRefreshFile = async () => {
    if (!directoryHandle || !selectedFileForRefresh) return;

    setIsLoading(true);
    const pathSegments = selectedFileForRefresh.split('/').filter(Boolean); // Split the path into segments
    pathSegments.shift();
    let currentHandle: FileSystemDirectoryHandle | undefined = directoryHandle;

    try {
        // Traverse down the tree to get the correct FileSystemDirectoryHandle
        for (let i = 0; i < pathSegments.length - 1; i++) {
            const segment = pathSegments[i];
            if (currentHandle) {
              currentHandle = await currentHandle.getDirectoryHandle(segment);
            } else {
              throw new Error("Could not traverse to directory: " + segment); // directory doesn't exist.
            }
        }

        const fileName = pathSegments[pathSegments.length - 1]; // get the file name, which is the last part

        if (!currentHandle) {
          throw new Error(`Could not find file handle. ${selectedFileForRefresh}`);
        }

        const fileHandle = await currentHandle.getFileHandle(fileName); // get the file handle for the file.
        const file = await fileHandle.getFile(); // get file
        const fileContent = await file.text(); // read the file content.

        // Alert the user or log it.  This doesn't update the fileSystemTree, it just reads and displays.
        console.log(`--- Refreshed ${selectedFileForRefresh} ---\n${fileContent}`);

    } catch (error) {
      console.error(`Error refreshing file ${selectedFileForRefresh}:`, error);
      alert(`Error refreshing file ${selectedFileForRefresh}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshFolder = async () => {
    if (!directoryHandle) return;

    setIsLoading(true);
    // Store current selections and expanded folders.
    const currentSelections = [...selectedPaths];
    const currentExpandedFolders = { ...expandedFolders };

    try {
      // Regenerate tree, using stored selections
      const tree = await generateFileSystemTree(directoryHandle, "", currentSelections);
      setFileSystemTree(tree);
      setExpandedFolders(currentExpandedFolders); // Restore expanded folders
      setSelectedPaths(currentSelections); // re-apply selections.
    } catch (error) {
      console.error("Error refreshing folder:", error);
      alert("Error refreshing folder");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySelectedFiles = async () => {
    if (!fileSystemTree || !directoryHandle) {
      alert("No files selected or tree generated");
      return;
    }

    let content = "";

    if (promptFileContent) {
      content = `\n--- Prompt Instruction: ${promptFileName} ---\n${promptFileContent}\n\n`;
    }

    async function traverseTree(nodes: TreeNode[], currentHandle: FileSystemDirectoryHandle) {
      for (const node of nodes) {
        if (node.selected) {
          if (node.type === "file") {
            try {
              const fileHandle = await currentHandle.getFileHandle(node.name);
              const file = await fileHandle.getFile();
              const fileContent = await file.text();
              content += `\n\n--- ${node.path} ---\n${fileContent}`;
            } catch (error) {
              console.error(`Error reading file ${node.path}:`, error);
              alert(`Error reading file ${node.path}`);
            }
          } else if (node.type === "directory" && node.children) {
            const dirHandle = await currentHandle.getDirectoryHandle(node.name);
            await traverseTree(node.children, dirHandle);
          }
        }
      }
    }

    await traverseTree(fileSystemTree, directoryHandle);

    if (content) {
      try {
        await navigator.clipboard.writeText(content);
        alert("File contents copied to clipboard!");
      } catch (error) {
        console.error("Error copying to clipboard:", error);
        alert("Failed to copy to clipboard: " + error);
      }
    } else {
      alert("No file content to copy.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <Card className="w-[90%] max-w-3xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">File System Browser</CardTitle>
          <CardDescription className="text-center">Select a directory and files to copy their contents.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {/* Prompt Instruction File Selection */}
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={handlePromptFileSelect}>
              Select Prompt Instruction File
            </Button>
            {promptFileHandle && (
                <>
                    <Button variant="destructive" onClick={handleClearPromptFile}>
                        Clear Selected File
                    </Button>
                    <Button variant="outline" onClick={handleRefreshPromptFile} disabled={isLoading}>
                        <RefreshCcw className="mr-2 h-4 w-4" /> Refresh Prompt File
                    </Button>
                </>
            )}
            {promptFileName && <span className="text-sm">Selected: {promptFileName}</span>}
          </div>

          {/* Directory Selection */}
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={handleDirectorySelect} disabled={isLoading}>
              Select Directory
            </Button>
            {directoryHandle && (
              <>
                <Button variant="destructive" onClick={handleClearSelectedFolder}>
                  Clear Selected Folder
                </Button>
                <Button variant="outline" onClick={handleRefreshFolder} disabled={isLoading}>
                  <RefreshCcw className="mr-2 h-4 w-4" /> Refresh Folder
                </Button>
              </>
            )}
            {directoryHandle && <span className="text-sm">Selected: {directoryHandle.name}</span>}
          </div>

          {/* File System Tree View */}
          {isLoading ? (
            <div className="flex items-center justify-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : fileSystemTree && (
            <div className="mt-4">
              <TreeView
                tree={fileSystemTree}
                onChange={handleNodeSelectionChange}
                expandedFolders={expandedFolders}
                onToggle={handleToggleFolder}
              />
            </div>
          )}

            {/* Refresh and Copy Buttons */}
            <div className="flex justify-center gap-4">
              {selectedFileForRefresh && (
                <Button variant="outline" onClick={handleRefreshFile} disabled={isLoading}>
                  <RefreshCcw className="mr-2 h-4 w-4" /> Refresh File
                </Button>
              )}
              <Button onClick={handleCopySelectedFiles} disabled={!fileSystemTree}>
                Copy Selected File Contents
              </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FileSystemBrowser;