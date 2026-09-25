import { FileFactory } from "./../utils/file-factory.js";

const fileInput = document.getElementById("file-input")
const theFilePreview = document.getElementById("the-file-preview");
const downloadButton = document.getElementById("download-button");
const processButton = document.getElementById("process-button");
const metaDataContainer = document.getElementsByClassName("metadata-container")[0];

let theFile;


fileInput.addEventListener("change", async function() {

  // display image and download button and remove old metadata
  theFile = await FileFactory.createFile(this.files[0]);
  
  theFilePreview.src = theFile.fileURL;
  downloadButton.href = theFile.fileURL;
  downloadButton.hidden = false;
  processButton.hidden = false;
  metaDataContainer.innerHTML = "";

  displayFields();
})

function addField(data, container) {

  // data: chunkPointer (number), keyword (string), text (string), additionalInfo (object)

  const field = document.createElement("div");
  const keywordField = document.createElement("textarea");
  const textField = document.createElement("textarea");
  const additionalInfoField = document.createElement("textarea");

  const removeButton = document.createElement("button");

  const chunkPointerField = document.createElement("textarea");

  keywordField.textContent = data.keyword;
  textField.textContent = data.text;
  additionalInfoField.textContent = JSON.stringify(data.additionalInfo);

  removeButton.textContent = "click to remove";

  chunkPointerField.innerHTML = data.chunkPointer;
  
  field.classList.add("metadata");
  removeButton.classList.add("remove-button");
  chunkPointerField.classList.add("pointer-reference");
  chunkPointerField.hidden = true;

  // field.appendChild(fieldData);
  field.appendChild(keywordField);
  field.appendChild(textField);
  field.appendChild(additionalInfoField);
  field.appendChild(removeButton);
  field.appendChild(chunkPointerField);

  container.appendChild(field);
}

// remove button clicked -> toggle chunk to be removed
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("remove-button")) {
    const parent = e.target.parentElement;
    parent.classList.toggle("to-be-removed");
    theFile.toggleChunkToRemove(parseInt(parent.lastChild.textContent));
    if (e.target.textContent == "click to remove") {
      e.target.textContent = "click to keep";
    }
    else {
      e.target.textContent = "click to remove";
    }
  }
})

processButton.addEventListener("click", function () {
  theFile.removeMarkedChunks();
  const newFileURL = theFile.fileURL;
  console.log(newFileURL);
  downloadButton.href = newFileURL;
})


async function displayFields() {
  while (theFile.hasNextChunk()) {
    if (!theFile.chunksToHide.includes(theFile.getChunkType(theFile.pointer))) {
      const data = await theFile.readNextChunk();
      addField(data[0], metaDataContainer);
      for (let dataobj in data) {
      }
    }
    else {
      theFile.pointer += theFile.getChunkSize(theFile.pointer);
    }
  }
}