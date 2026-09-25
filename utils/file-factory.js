import { PNG } from "./png-class.js";
import { JPEG } from "./jpeg-class.js";

export class FileFactory {
  static async createFile(file, safeMode = false) {
    switch (file.type) {
      case "image/png":
        return PNG.create(file, safeMode);
        break;
      case "image/jpeg":
        return JPEG.create(file, safeMode);
        break;
      default:
        throw new Error("File type is not supported (yet :))");
    }
  }
}