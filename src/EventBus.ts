export type Subscriber<T> = (data: T) => void;
export type UbsubscribeCallback = () => void;

/** Simple implementation of classic observer pattern */
export class EventBus<T> {
  private subscribers: Array<Subscriber<T>> = [];

  /** Remove all subscribers. */
  public clear() {
    this.subscribers.length = 0;
  }

  /** Listen for events. */
  public subscribe(subscriber: Subscriber<T>) {
    this.subscribers.push(subscriber);
    return () => this.unsubscribe(subscriber);
  }

  /** Stop listening. */
  public unsubscribe(subscriber: Subscriber<T>) {
    const index = this.subscribers.indexOf(subscriber);
    if (index >= 0) {
      this.subscribers.splice(index, 1);
    }
  }

  /** Signal an event. */
  public emit(data: T) {
    this.subscribers.forEach(subscriber => subscriber(data));
  }
}
