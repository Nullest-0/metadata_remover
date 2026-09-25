export class JPEG {
  
  constructor(file, safeMode = false, arrayBuffer) {
    /* todo: deeper type check, not just MIME type. examples:
    * file signature (first few "magic" bytes),
    * file structure (ensure chunk names are correct, chunks in correct order, etc..),
    * file must have a minimum size
    */
    if (safeMode) {
     throw new TypeError("Invalid / corrupt PNG file");
    }
    
    this.file = file;
    this.fileURL = URL.createObjectURL(file);
    this.arrayBuffer = arrayBuffer;
    this.byteView = new Uint8Array(arrayBuffer);
    this.chunksToRemove = [];
    this.pointer = 8;
    this.chunksToHide = [0xFFD8, 0xFFD9, 0xFF01, 0xFFDA,
                         0xFFD0, 0xFFD1, 0xFFD2, 0xFFD3, 0xFFD4, 0xFFD5, 0xFFD6, 0xFFD7,
                         0xFFC0, 0xFFC1, 0xFFC2, 0xFFC3, 0xFFC5, 0xFFC6, 0xFFC7, 0xFFC9,
                         0xFFCA, 0xFFCB, 0xFFCD, 0xFFCE, 0xFFCF,
                         0xFFC4, 0xFFDB, 0xFFDD, 0xFFCC, 0xFFDE, 0xFFDF];

  }

  // because constructors can't be async
  static async create(file, safeMode = false) {
    const arrayBuffer = await file.arrayBuffer();
    return new PNG(file, safeMode, arrayBuffer);
  }

  getChunkSize(pointer) {
    return this.getChunkLength(pointer) + 12;
  }

  getChunkLength(pointer) {
    return (
      (this.byteView[pointer] << 24) |
      (this.byteView[pointer + 1] << 16) |
      (this.byteView[pointer + 2] << 8) |
      this.byteView[pointer + 3]
    ) >>> 0;
  }

  getChunkType(pointer) {
    return(String.fromCharCode(this.byteView[pointer + 4], this.byteView[pointer + 5], this.byteView[pointer + 6], this.byteView[pointer + 7]));
  }

  hasNextChunk() {
    // +12 because PNG chunks are at least 12 bytes long: 4 bytes type -> 4 bytes length -> data -> 4 bytes CRC
    if (this.pointer + 12 >= this.byteView.length) {
      return false;
    }

    const size = this.getChunkSize(this.pointer);

    if (size <= 0 || this.pointer + size > this.byteView.length) {
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
    this.pointer = 8;
    this.chunksToRemove.length = 0;
    this.byteView = new Uint8Array(newFileArray);
    this.arrayBuffer = this.byteView.buffer;
    this.file = new Blob([this.byteView], {type: "image/png"});
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
    
    if (chunkType == "tEXt") {

      this.pointer += 8;
      
      while (this.byteView[this.pointer] != 0 && this.pointer < nextChunkPointer - 4) {
        keyword += String.fromCharCode(this.byteView[this.pointer]);
        this.pointer++;
      }
      
      this.pointer++;
      
      while (this.pointer < nextChunkPointer - 4) {
        text += String.fromCharCode(this.byteView[this.pointer]);
        this.pointer++;
      }
      
      additionalInfo.chunkType = "tEXt";
    }

    else if (chunkType == "iTXt") {
      
      this.pointer += 8;

      while (this.byteView[this.pointer] != 0 && this.pointer < nextChunkPointer - 4) {
        keyword += String.fromCharCode(this.byteView[this.pointer]);
        this.pointer++;
      }

      this.pointer++;

      const compressionFlag = this.byteView[this.pointer];
      this.pointer++;

      const compressionMethod = this.byteView[this.pointer];
      this.pointer++;

      let languageTag = "";
      while (this.byteView[this.pointer] != 0 && this.pointer < nextChunkPointer - 4) {
        languageTag += String.fromCharCode(this.byteView[this.pointer]);
        this.pointer++;
      }

      this.pointer++;

      let translatedKeyword = "";
      let translatedKeywordLength = 0;
      const decoder = new TextDecoder();
      while (this.byteView[this.pointer] != 0 && this.pointer < nextChunkPointer - 4) {
        translatedKeywordLength++;
        this.pointer++;
      }
      translatedKeyword = decoder.decode(this.byteView.subarray(this.pointer - translatedKeywordLength, this.pointer));

      this.pointer++;

      if (compressionFlag) {
        if (compressionMethod == 0) {
          const subView = this.byteView.subarray(this.pointer, nextChunkPointer - 4);
          const subStream = new Response(subView).body;
          const decompressionStream = new DecompressionStream("deflate");
          const decompressedStream = subStream.pipeThrough(decompressionStream);
          const subBuffer = await new Response(decompressedStream).arrayBuffer();
          text = decoder.decode(subBuffer);
        }
        else {
          console.log("unsupported compression method");
        }
      }
      else {
        text = decoder.decode(this.byteView.subarray(this.pointer, nextChunkPointer - 4));
      }

      additionalInfo.chunkType = "iEXt";
      additionalInfo.compressionFlag = compressionFlag;
      additionalInfo.compressionMethod = compressionMethod;
      additionalInfo.languageTag = languageTag;
      additionalInfo.translatedKeyword = translatedKeyword;
    }
    
    else if (chunkType == "zTXt") {

      this.pointer += 8;

      while (this.byteView[this.pointer] != 0 && this.pointer < nextChunkPointer - 4) {
        keyword += String.fromCharCode(this.byteView[this.pointer]);
        this.pointer++;
      }

      this.pointer++;

      const compressionMethod = this.byteView[this.pointer];
      this.pointer++;

      const decoder = new TextDecoder();
      if (compressionMethod == 0) {
        const subView = this.byteView.subarray(this.pointer, nextChunkPointer - 4);
        const subStream = new Response(subView).body;
        const decompressionStream = new DecompressionStream("deflate");
        const decompressedStream = subStream.pipeThrough(decompressionStream);
        const subBuffer = await new Response(decompressedStream).arrayBuffer();
        text = decoder.decode(subBuffer);
      }
      else {
        console.log("unsupported compression method");
      }

      additionalInfo.chunkType = "zTXt";
      additionalInfo.compressionMethod = compressionMethod;
    }
    
    else {
      console.log("unsupported chunk type");
      console.log(chunkType);
    }

    data.push({chunkPointer: chunkPointer, keyword: keyword, text: text, additionalInfo: additionalInfo});
    this.pointer = nextChunkPointer;
    console.log(data);
    return data;
  }

  // might be useful idk
  readNextChunkBinary() {

  }
}