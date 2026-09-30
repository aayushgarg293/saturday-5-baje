/**
 * The few files on this cafe PC, in the folders you can open: My Music
 * (other customers' leftovers, and whatever you download), My Pictures,
 * and his own pen drive (F:), with his photos on it. Just names and sizes
 * (and photos painted in code, photos.ts): nothing is really stored.
 */

export type Folder = "music" | "pictures" | "pendrive";

export const FOLDERS: Record<Folder, string> = {
  music: "My Music",
  pictures: "My Pictures",
  pendrive: "Removable Disk (F:)",
};

export type VFile = {
  name: string;
  folder: Folder;
  /** Size in KB. */
  size: number;
  kind: "mp3" | "jpg";
  /** Which story task this file can complete, when sent ("jabWeMate": a Jab We Mate song; "teamPhoto"). */
  tag?: string;
  /** A photo's picture (a painter in photos.ts). */
  photo?: string;
};

/** "3.4 MB" / "820 KB". */
export function sizeLabel(kb: number): string {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

export class Files {
  /** Called when a file is added (folder windows redraw). */
  readonly onChange = new Set<() => void>();

  private all: VFile[] = [
    // left behind by other customers (every cafe PC had these)
    { name: "Dhoom Dhaam Again.mp3", folder: "music", size: 4198, kind: "mp3" },
    { name: "track01.mp3", folder: "music", size: 2870, kind: "mp3" },
    { name: "bhajan_collection_03.mp3", folder: "music", size: 6420, kind: "mp3" },
    { name: "mobile tune remix.mp3", folder: "music", size: 512, kind: "mp3" },
    { name: "Sunset.jpg", folder: "pictures", size: 70, kind: "jpg" },
    { name: "Blue hills.jpg", folder: "pictures", size: 28, kind: "jpg" },
    { name: "IMG_0042.jpg", folder: "pictures", size: 214, kind: "jpg", photo: "blurry" },
    // his pen drive
    { name: "team_photo_final.jpg", folder: "pendrive", size: 640, kind: "jpg", photo: "team", tag: "teamPhoto" },
    { name: "rohan farewell.jpg", folder: "pendrive", size: 580, kind: "jpg", photo: "farewell" },
    { name: "diwali 2006.jpg", folder: "pendrive", size: 470, kind: "jpg", photo: "diwali" },
    { name: "IMG0023.jpg", folder: "pendrive", size: 190, kind: "jpg", photo: "blurry" },
  ];

  list(folder: Folder): VFile[] {
    return this.all.filter((f) => f.folder === folder);
  }

  add(file: VFile) {
    if (!this.all.some((f) => f.folder === file.folder && f.name === file.name)) this.all.push(file);
    for (const fn of this.onChange) fn();
  }
}
