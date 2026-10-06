// catch event -> modify file -> trigger event again with modified file
document.addEventListener("change", async function (e) {
  
  const input = e.target;  
  
  if (input.tagName === 'INPUT' && input.type === 'file' && input.files.length > 0) {
    
    // To prevent an infinite loop, check if we've already cleaned this input
    if (input.dataset.metadataCleanedByTheExtension === "true") {
      delete input.dataset.metadataCleanedByTheExtension;
      return; // Let the event pass safely to the website
    }

    e.stopImmediatePropagation();
    e.preventDefault();
    
    const dataTransfer = new DataTransfer();
    
    const fileFactoryURL = chrome.runtime.getURL("utils/file-factory.js");
    const { FileFactory } = await import(fileFactoryURL);

    for (let file of input.files) {
      try {
        const theFile = await FileFactory.createFile(file);
        theFile.removeMetadataChunks();
        const newFile = new File([theFile.file], file.name, { type: file.type });
        dataTransfer.items.add(newFile);
      }
      catch (err) {
        console.log(`${err}, file: ${file.name}`);
        dataTransfer.items.add(file);
      }
    }

    input.files = dataTransfer.files;

    input.dataset.metadataCleanedByTheExtension = "true";

    const newEvent = new Event('change', { bubbles: true });
    input.dispatchEvent(newEvent);
  }
}, true);

// TODO: consider other file upload methods
// document.addEventListener("dragover", async function (e) {

// }, true);

// document.addEventListener("drop", async function (e) {

// }, true);

// document.addEventListener("paste", async function (e) {

// }, true);