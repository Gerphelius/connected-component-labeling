import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';

// https://en.wikipedia.org/wiki/Connected-component_labeling
// https://en.wikipedia.org/wiki/Hoshen%E2%80%93Kopelman_algorithm

@Component({
  selector: 'my-app',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  @ViewChild('fieldEl') fieldEl: ElementRef<HTMLDivElement>;

  public field: IField = {
    width: 10,
    height: 10,
    pixelWidthPx: 50,
    pixelsMatrix: [],
  };
  public paintColor = '#000000';
  public defaultColor = '#ffffff';
  public showPixelPosition = false;
  public isMouseDown = false;
  public removeMode = false;
  public connectivity = 8;
  public numberOfAreas = 0;

  private _label = 1;
  private _linkedPixelsSet = new DisjointSet();
  private _allNeighborsPos: IVector2d[] = [
    { x: 1, y: -1 },
    { x: 0, y: -1 },
    { x: -1, y: -1 },
    { x: -1, y: 0 },
  ];
  private _currentNeighbors: IVector2d[] = [];
  private mergeAreasWorker = new Worker('mergeAreas.ts');

  ngOnInit(): void {
    this._createPixelsMatrix();
    this.setConnectivity(this.connectivity, true);
  }

  public setConnectivity(x: number, init = false): void {
    this.connectivity = x;
    this._currentNeighbors = [];

    for (let i = 0; i < 4; i++) {
      if (x === 4 && i % 2 === 0) continue;

      this._currentNeighbors.push(this._allNeighborsPos[i]);
    }

    if (!init) {
      this.twoPassAlgorithm();
      this.mergeAreasLabels();
    }
  }

  public paintPixel(pixel: IPixel, clicked: boolean): void {
    if (this.isMouseDown || clicked) {
      pixel.color = this.removeMode ? this.defaultColor : this.paintColor;
      pixel.value = this.removeMode ? 0 : 1;
      this.removeMode && (pixel.label = 0);

      this.twoPassAlgorithm();
      this.mergeAreasLabels();
    }
  }

  public twoPassAlgorithm(): void {
    // Set default label start value
    this._label = 1;
    this._linkedPixelsSet = new DisjointSet();

    this.field.pixelsMatrix.forEach((row) => {
      row.forEach((pixel) => {
        if (pixel.value) {
          this._checkNeighbors(pixel);
        }
      });
    });
  }

  public mergeAreasLabels(): void {
    this.field.pixelsMatrix.forEach((row) => {
      row.forEach((pixel) => {
        if (pixel.label) {
          pixel.label = this._linkedPixelsSet.find(pixel.label);
          pixel.color = `hsl(${pixel.label * 100}, 50%, 50%)`;
        }
      });
    });

    this.numberOfAreas = this._linkedPixelsSet.getNumberOfAreas();
  }

  public clearField(): void {
    this.field.pixelsMatrix.forEach((row) => {
      row.forEach((pixel) => {
        pixel.color = this.defaultColor;
        pixel.value = 0;
        pixel.label = 0;
      });
    });

    this.numberOfAreas = 0;
  }

  private _createPixelsMatrix(): void {
    for (let row = 0; row < this.field.height; row++) {
      const rowPixels: IPixel[] = [];

      for (let column = 0; column < this.field.width; column++) {
        rowPixels.push({
          color: this.defaultColor,
          value: 0,
          label: 0,
          position: {
            x: column,
            y: row,
          },
        });
      }

      this.field.pixelsMatrix.push(rowPixels);
    }
  }

  private _checkNeighbors(pixel: IPixel) {
    const neighbors = [];

    this._currentNeighbors.forEach((pos) => {
      const neighbour = this._isNeighborValid(pos, pixel);

      if (neighbour && neighbour.value && neighbour.label) {
        neighbors.push(neighbour.label);
      }
    });

    if (neighbors.length) {
      pixel.label = Math.min(...neighbors);

      neighbors.forEach((el) => {
        this._linkedPixelsSet.union(pixel.label, el);
      });
    } else {
      this._linkedPixelsSet.makeSet(this._label);
      pixel.label = this._label++;
    }
  }

  private _isNeighborValid(pos: IVector2d, pixel: IPixel): IPixel | null {
    return (
      (this.field.pixelsMatrix[pixel.position.y + pos.y] &&
        this.field.pixelsMatrix[pixel.position.y + pos.y][
          pixel.position.x + pos.x
        ]) ||
      null
    );
  }
}

interface IPixel {
  color: string;
  value: number;
  label: number;
  position: IVector2d;
}

interface IField {
  width: number;
  height: number;
  pixelWidthPx: number;
  pixelsMatrix: Array<IPixel[]>;
}

interface IVector2d {
  x: number;
  y: number;
}

class DisjointSet {
  private _parent = [];

  public makeSet(x: number): void {
    this._parent[x] = x;
  }

  public find(x: number): number {
    let y = x;

    while (this._parent[y] !== y) {
      y = this._parent[y];
    }

    while (this._parent[x] != x) {
      let z = this._parent[x];

      this._parent[x] = y;
      x = z;
    }

    return y;
  }

  public union(x: number, y: number): number {
    return (this._parent[this.find(y)] = this.find(x));
  }

  public getNumberOfAreas(): number {
    return new Set(this._parent.slice(1)).size;
  }

  public log(): void {
    console.log(`Parent: ${this._parent}`);
  }
}
