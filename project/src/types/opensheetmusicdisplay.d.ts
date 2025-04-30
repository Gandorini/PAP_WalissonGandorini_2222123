declare module 'opensheetmusicdisplay' {
  export class OpenSheetMusicDisplay {
    constructor(container: HTMLElement);
    setOptions(options: any): void;
    load(data: string): Promise<void>;
    render(): void;
  }
} 