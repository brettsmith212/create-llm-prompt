"use client";
import {
  useState,
  useEffect,
} from "react";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Loader2, RefreshCcw, FolderPlus, FilePlus, XCircle, ListChecks } from "lucide-react";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "~/components/ui/tooltip";

interface TreeNode {
  path: string;
  name: string;
  type: "file" | "directory";
  children?: TreeNode[];
  selected: boolean;
}

// Updated generateFileSystemTree function - Truly Asynchronous and No file content loading
async function generateFileSystemTree(
  handle: FileSystemDirectoryHandle,
  path: string = "",
  initialSelection: string[] = []
): Promise<TreeNode[]> {
  const nodes: TreeNode[] = [];
  const entryPromises: Promise<void>[] = [];

  try {
      // Collect all entry processing promises
    for await (const entry of handle.values()) {
      entryPromises.push(
        (async () => {
          const entryPath = `${path}/${entry.name}`;

          if (entry.kind === 'directory') {
            const dirHandle = await handle.getDirectoryHandle(entry.name);

            // Recursively check if selection is valid
            const filteredSelection = await Promise.all(initialSelection.map(async (selPath) => {
                const segments = selPath.split('/').filter(Boolean);
                segments.shift();
                let current: FileSystemDirectoryHandle | FileSystemFileHandle = handle;

                try {
                    for (const segment of segments) {
                      if (current.kind === 'directory') {
                          try {
                            current = await current.getDirectoryHandle(segment);
                          } catch {
                              try {
                                current = await current.getFileHandle(segment);
                              } catch {
                                return null;  // Neither file nor directory exists
                              }
                          }
                      } else {
                        return null; // If the current level is not a directory, then we have more segments, it is invalid.
                      }
                    }
                  return selPath; // If we made it here, it is a valid selection
                } catch (error) {
                  return null;  // Invalid selection
                }
            }));


            const validSelection = filteredSelection.filter((sel): sel is string => sel !== null);

            const children = await generateFileSystemTree(dirHandle, entryPath, validSelection);
            const isSelected = validSelection.includes(entryPath);
            nodes.push({
              path: entryPath,
              name: entry.name,
              type: "directory",
              children: children,
              selected: isSelected,
            });
          } else {
              //check if selection is valid (same as above).
            const isValidSelection = await (async() => {
              const segments = entryPath.split('/').filter(Boolean);
                segments.shift();
                let current: FileSystemDirectoryHandle | FileSystemFileHandle = handle;

                try {
                  for(const segment of segments) {
                    if (current.kind === 'directory') {
                        try {
                            current = await current.getDirectoryHandle(segment);
                        } catch {
                            try {
                                current = await current.getFileHandle(segment);
                            } catch {
                                return false;  // Neither exists
                            }
                        }
                    }
                    else {
                      return false;  // If the current level is not a directory, then we have more segments, it is invalid.
                    }
                  }
                  return true; // If we made it here, it is a valid selection
                } catch (error) {
                  return false; // Invalid
                }
            })();

            const isSelected = isValidSelection && initialSelection.includes(entryPath);
            nodes.push({
              path: entryPath,
              name: entry.name,
              type: "file",
              selected: isSelected,
            });
          }
        })()
      );
    }
     // Await all entry processing concurrently
        await Promise.all(entryPromises);
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
  const [showSelectedFiles, setShowSelectedFiles] = useState(false);


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
    let currentSelections = [...selectedPaths];
    const currentExpandedFolders = { ...expandedFolders };

     // Helper function to recursively un-select all nodes in tree.
    function unselectAll(tree: TreeNode[]): TreeNode[] {
      return tree.map(node => ({
        ...node,
        selected: false,
        children: node.children ? unselectAll(node.children) : undefined
      }));
    }

    // Un-select all nodes in existing fileSystemTree.
    if (fileSystemTree) {
      setFileSystemTree(unselectAll(fileSystemTree)); //update
    }

    setSelectedPaths([]); // Clear selected paths

    try {
      // Regenerate tree
      const tree = await generateFileSystemTree(directoryHandle, "", []);

      setFileSystemTree(tree);
      setExpandedFolders(currentExpandedFolders);

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

    // Recursively traverse and get file contents ONLY for selected files
    async function traverseAndCopy(nodes: TreeNode[], currentHandle: FileSystemDirectoryHandle) {
      for (const node of nodes) {
        if (node.selected) {
          if (node.type === "file") {
            try {
              const fileHandle = await currentHandle.getFileHandle(node.name);
              const file = await fileHandle.getFile();
              const fileContent = await file.text(); // NOW we read the file content
              content += `\n\n--- ${node.path} ---\n${fileContent}`;
            } catch (error) {
              console.error(`Error reading file ${node.path}:`, error);
            }
          } else if (node.type === "directory" && node.children) {
              const childDirHandle = await currentHandle.getDirectoryHandle(node.name); //get directory handle of child
              await traverseAndCopy(node.children, childDirHandle); //recurse using that handle.
          }
        }
      }
    }

    await traverseAndCopy(fileSystemTree, directoryHandle);

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
      <TooltipProvider>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">File System Browser</CardTitle>
          <CardDescription className="text-center">Select a directory and files to copy their contents.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {/* Prompt Instruction File Selection */}
          <div className="flex items-center flex-wrap gap-2">
             <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline"  onClick={handlePromptFileSelect}>
                    <FilePlus className="mr-2 h-4 w-4" />
                    Select Prompt File
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Select Prompt Instruction File</p>
                </TooltipContent>
              </Tooltip>
            {promptFileName && (
              <span className="text-sm bg-secondary text-secondary-foreground px-3 py-1.5 rounded">
                File: {promptFileName}
              </span>
            )}
            {promptFileHandle && (
              <>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="destructive" size="icon" onClick={handleClearPromptFile}>
                        <XCircle className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Clear Selected File</p>
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={handleRefreshPromptFile} disabled={isLoading}>
                        <RefreshCcw className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Refresh Prompt File</p>
                    </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>

          {/* Directory Selection */}
          <div className="flex items-center flex-wrap gap-2">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline"  onClick={handleDirectorySelect} disabled={isLoading}>
                    <FolderPlus className="mr-2 h-4 w-4" />
                    Select Directory
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Select Directory</p></TooltipContent>
            </Tooltip>

            {directoryHandle && (
              <span className="text-sm bg-secondary text-secondary-foreground px-3 py-1.5 rounded">
                Folder: {directoryHandle.name}
              </span>
            )}
            {directoryHandle && (
              <>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="destructive" size="icon" onClick={handleClearSelectedFolder}>
                        <XCircle className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Clear Selected Folder</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={handleRefreshFolder} disabled={isLoading}>
                            <RefreshCcw className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Refresh Folder</p>
                    </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>

            {/* Show Selected Files Button */}
            {selectedPaths.length > 0 && (
                <div className="flex items-center gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setShowSelectedFiles(!showSelectedFiles)}
                        >
                            <ListChecks className="h-4 w-4" />
                        </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                        <p>Toggle Selected Files</p>
                        </TooltipContent>
                    </Tooltip>
                    <span className="text-sm text-muted-foreground">
                        {selectedPaths.length} files selected
                    </span>
                </div>
            )}
            {/* Selected Files */}
            {showSelectedFiles && (
                <div className="border rounded-md p-2 bg-muted-foreground text-muted text-sm">
                    <ul className="list-disc list-inside">
                        {selectedPaths.map((path) => (
                        <li key={path}>{path}</li>
                        ))}
                    </ul>
                </div>
            )}

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
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={handleRefreshFile} disabled={isLoading}>
                            <RefreshCcw className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Refresh Selected File</p>
                    </TooltipContent>
                </Tooltip>
              )}
               <Tooltip>
                    <TooltipTrigger asChild>
                        <Button onClick={handleCopySelectedFiles} disabled={!fileSystemTree}>
                            Copy Selected File Contents
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Copy Selected Files</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </CardContent>
        </TooltipProvider>
      </Card>
    </div>
  );
};

export default FileSystemBrowser;