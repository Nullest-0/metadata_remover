// 1. Listen for the 'change' event in the CAPTURE phase (note the 'true' at the end)
document.addEventListener('change', async (event) => {
// 1. Get the internal Chrome URL for your module
    const factoryUrl = chrome.runtime.getURL("utils/file-factory.js");
    
    // 2. Dynamically import it!
    const { FileFactory } = await import(factoryUrl);
    
    const input = event.target;
    console.log("zero");
    // 2. Only act if the element is a file input and actually has files
    if (input.tagName === 'INPUT' && input.type === 'file' && input.files.length > 0) {
        
        // To prevent an infinite loop, check if we've already cleaned this input
        if (input.dataset.metadataCleaned === "true") {
            delete input.dataset.metadataCleaned;
            return; // Let the event pass safely to the website
        }

        // 3. STOP the website from seeing the dirty file
        event.stopImmediatePropagation();
        event.preventDefault();

        // 4. The DataTransfer API is the only way to programmatically modify a FileList
        const dataTransfer = new DataTransfer();
        
        for (let file of input.files) {
            // Check if it's a format we support
            if (file.type === 'image/jpeg' || file.type === 'image/png') {
              
              console.log("one");
              const theFile = await FileFactory.createFile(file);

              theFile.removeMetadataChunks();

              const newFile = new File([theFile.file], `cat.png`);
              dataTransfer.items.add(newFile);

                // // Read the dirty file bytes
                // const arrayBuffer = await file.arrayBuffer();
                
                // // --- YOUR OOP CORE ENGINE GOES HERE ---
                // // const cleanBytes = factory.GetRemover(file.type).StripMetadata(arrayBuffer);
                // const cleanBytes = arrayBuffer; // Placeholder for your logic
                
                // // Create a new File object with the clean bytes
                // const cleanFile = new File([cleanBytes], file.name, {
                //     type: file.type,
                //     // Bonus privacy feature: overwrite the "last modified" timestamp
                //     lastModified: Date.now() 
                // });
                
                // dataTransfer.items.add(cleanFile);
            } else {
                // If it's a PDF or something else, just pass it through untouched
                dataTransfer.items.add(file);
                console.log("two");
            }
        }

        // 5. Swap the input's files with our clean files
        input.files = dataTransfer.files;
        
        // 6. Mark it as cleaned so we don't trigger our own listener again
        input.dataset.metadataCleaned = "true";

        // 7. Manually re-trigger the change event so the website's code executes
        const newEvent = new Event('change', { bubbles: true });
        input.dispatchEvent(newEvent);
    }
}, true); // <-- The 'true' is critical. It forces this to run before website scripts.