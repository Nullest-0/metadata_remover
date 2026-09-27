import { getUintBigEndian } from "./converters.js";

export class JPEG {
  
  constructor(file, safeMode = false, arrayBuffer) {
    /* todo: deeper type check, not just MIME type. examples:
    * file signature (first few "magic" bytes),
    * file structure (ensure chunk names are correct, chunks in correct order, etc..),
    * file must have a minimum size
    */
    if (safeMode) {
     throw new TypeError("Invalid / corrupt JPEG file");
    }
    
    this.file = file;
    this.fileURL = URL.createObjectURL(file);
    this.arrayBuffer = arrayBuffer;
    this.byteView = new Uint8Array(arrayBuffer);
    this.chunksToRemove = [];
    this.pointer = 2;
    this.chunksToHide = [0xFFD8, 0xFFD9, 0xFF01, 0xFFDA,
                         0xFFD0, 0xFFD1, 0xFFD2, 0xFFD3, 0xFFD4, 0xFFD5, 0xFFD6, 0xFFD7,
                         0xFFC0, 0xFFC1, 0xFFC2, 0xFFC3, 0xFFC5, 0xFFC6, 0xFFC7, 0xFFC9,
                         0xFFCA, 0xFFCB, 0xFFCD, 0xFFCE, 0xFFCF,
                         0xFFC4, 0xFFDB, 0xFFDD, 0xFFCC, 0xFFDE, 0xFFDF];
    this.metadataChunks = [0xFFE0, 0xFFE1,
                           0xFFE2, 0xFFE3, 0xFFE4, 0xFFE5, 0xFFE6, 0xFFE7, 0xFFE8, 0xFFE9, 0xFFEA, 0xFFEB, 0xFFEC, 0xFFED, 0xFFEE, 0xFFEF];
  }

  // because constructors can't be async
  static async create(file, safeMode = false) {
    const arrayBuffer = await file.arrayBuffer();
    return new JPEG(file, safeMode, arrayBuffer);
  }

  getChunkSize(pointer) {
    return this.getChunkLength(pointer) + 2;
  }

  getChunkLength(pointer) {
    const zeroLengthChunks = [0xFFD8, 0xFFD9, 0xFF01, 0xFFD0, 0xFFD1, 0xFFD2, 0xFFD3, 0xFFD4, 0xFFD5, 0xFFD6, 0xFFD7];
    
    if (zeroLengthChunks.includes(this.getChunkType(pointer))) {
      return 0;
    }
    else {
      return ((this.byteView[pointer + 2] << 8) | this.byteView[pointer + 3]);
    }
  }

  getChunkType(pointer) {
    return((this.byteView[pointer] << 8) | this.byteView[pointer + 1]);
  }

  hasNextChunk() {
    // to prevent going out of bound
    if (this.pointer >= this.byteView.length) {
      return false;
    }

    const size = this.getChunkSize(this.pointer);
    const type = this.getChunkType(this.pointer);
    
    // 0xFFDA is Start of Scan chunk marker. After it, the file structure changes and only pixel data and end of image marker are left, no metadata to be found, so we treat SOS as "end of file" although it isn't
    if (size <= 0 || this.pointer + size > this.byteView.length || type == 0xFFDA) {
      return false;
    }
    
    return true;
  }

  toggleChunkToRemove(pointer) {
    const index = this.chunksToRemove.indexOf(pointer);
    if (index == -1) {
      this.chunksToRemove.push(pointer);
    }
    else {
      this.chunksToRemove.splice(index, 1);
    }
  }

  removeMarkedChunks() {
    
    this.chunksToRemove.sort();
    
    const newFileArray = Array.from(this.byteView);

    for (let i = this.chunksToRemove.length - 1; i >= 0; i--) {
      newFileArray.splice(this.chunksToRemove[i], this.getChunkSize(this.chunksToRemove[i]));
    }

    // "reinitialize"
    this.pointer = 2;
    this.chunksToRemove.length = 0;
    this.byteView = new Uint8Array(newFileArray);
    this.arrayBuffer = this.byteView.buffer;
    this.file = new Blob([this.byteView], {type: "image/jpeg"});
    this.fileURL = URL.createObjectURL(this.file);
  }

  async readNextChunk() {
    
    const data = [];

    const chunkType = this.getChunkType(this.pointer);
    const nextChunkPointer = this.pointer + this.getChunkSize(this.pointer);
    const chunkPointer = this.pointer;

    let keyword = "";
    let text = "";
    let additionalInfo = {};
    additionalInfo.chunkType = chunkType;
    
    // 0xFFE0 == JFIF
    if (chunkType == 0xFFE0) {
      
      this.pointer += 4;

      const identifier = String.fromCharCode(this.byteView[this.pointer], this.byteView[this.pointer + 1], this.byteView[this.pointer + 2], this.byteView[this.pointer + 3]);
      
      this.pointer += 5;

      const version = this.byteView[this.pointer] + 0.01 * this.byteView[this.pointer + 1];
      this.pointer += 2;

      const units = this.byteView[this.pointer];
      this.pointer++;

      const Xdensity = getUintBigEndian(this.byteView, this.pointer, 2);
      this.pointer += 2;

      const Ydensity = getUintBigEndian(this.byteView, this.pointer, 2);
      this.pointer += 2;

      const Xthumbnail = this.byteView[this.pointer];
      this.pointer++;

      const Ythumbnail = this.byteView[this.pointer];
      this.pointer++;

      additionalInfo.identifier = identifier;
      additionalInfo.version = version;
      additionalInfo.units = units;
      additionalInfo.Xdensity = Xdensity;
      additionalInfo.Ydensity = Ydensity;
      additionalInfo.Xthumbnail = Xthumbnail;
      additionalInfo.Ythumbnail = Ythumbnail;
    }
    // 0xFFE1 == EXIF
    else if (chunkType == 0xFFE1) {
      console.log("this won't see the light of day for sure (not in javascript)")
    }
    else {
      console.log(`unsupported chunk type: ${chunkType}`);
    }

    data.push({chunkPointer: chunkPointer, keyword: keyword, text: text, additionalInfo: additionalInfo});
    this.pointer = nextChunkPointer;
    console.log(data);
    return data;
  }

  // might be useful idk
  readNextChunkBinary() {

  }

  removeMetadataChunks() {
    this.pointer = 2;
    this.chunksToRemove.length = 0;

    while (this.hasNextChunk()) {
      if (this.metadataChunks.includes(this.getChunkType(this.pointer))) {
        console.log(`to be removed chunk type: ${this.getChunkType(this.pointer)}`);
        this.toggleChunkToRemove(this.pointer);
      }
      else {
        console.log(`not to be removed chunk type: ${this.getChunkType(this.pointer)}`);
      }
      this.pointer += this.getChunkSize(this.pointer);
    }

    this.removeMarkedChunks();
  }
}