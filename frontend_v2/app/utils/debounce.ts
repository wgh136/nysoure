export class Debounce {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly delay: number;

  constructor(delay: number) {
    this.delay = delay;
  }

  run(callback: () => void) {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      callback();
    }, this.delay);
  }

  cancel() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
