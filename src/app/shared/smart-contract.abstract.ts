import * as Web3Module from 'web3';
import { Tx } from 'web3/types';
import * as contract from 'truffle-contract';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import 'rxjs/add/observable/fromPromise';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/operator/share';

import { Web3Service } from './web3.service';
import {
  Contract, TruffleContract,
  TruffleContractConstantMethods, TruffleContractConstantIteratorMethods, TruffleContractActionMethods, TruffleContractEventMethods,
} from './truffle.interface';

export abstract class SmartContract<C, CI extends {[p: string]: any[]}, A, E> {
  protected readonly _onInitialized: BehaviorSubject<any> = new BehaviorSubject(undefined);
  readonly onInitialized: Observable<any> = this._onInitialized.filter(_ => !!_);
  protected contract: TruffleContract<C, CI, A, E>;
  private readonly isBigNumber = (new (<any>Web3Module)()).utils.isBigNumber;

  get initialized(): boolean {
    return !!this.contract;
  }
  set initialized(value: boolean) {
    if (value) {
      this._onInitialized.next(true);
    }
  }

  get address(): string {
    return (this.contract || {} as any).address;
  }

  constructor(protected web3Service: Web3Service) { }

  checkUpdates<T>(fn: (context: this) => Promise<T>): Observable<T> {
    return Observable
      .merge(this.web3Service.changes$, this.onInitialized)
      .filter(() => this.initialized)
      .mergeMap(() => Observable.fromPromise(fn(this)))
      .catch(e => console.warn('checkUpdates error: ', {fn, e}) || Observable.empty<any>())
      .distinctUntilChanged()
      .share();
  }

  getTokenInfo(): Observable<{name?: string, symbol?: string, decimals?: number}> {
    const emptyPromise = () => new Promise(resolve => resolve(undefined));
    return this
      .checkUpdates(async contract => ({
        name: await ((<any>contract).name || emptyPromise)(),
        symbol: await ((<any>contract).symbol || emptyPromise)(),
        decimals: await ((<any>contract).decimals || emptyPromise)(),
      }))
      .distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
      .share();
  }

  protected getContract(smartContractDescriptor: any): Contract<TruffleContract<C, CI, A, E>> {
    const contractLoader = contract(smartContractDescriptor);
    contractLoader.setProvider(this.web3Service.web3.currentProvider);
    return contractLoader;
  }

  protected generateConstant<P extends keyof TruffleContractConstantMethods<C>>(
    constant: P,
    mapper?: (response: any) => C[P]
  ): (...args) => Promise<C[P]> {

    return (...args) =>
      new Promise((resolve, reject) => {
        if (!this.contract) {
          resolve(undefined);
          return;
        }
        (<any>this.contract)[constant](...args)
          .then(result => {
            if (this.isBigNumber(result)) {
              result = +result;
            }
            if (result instanceof Array) {
              result = result.map(_ => this.isBigNumber(_) ? +_ : _);
            }
            resolve(mapper ? mapper(result) : result);
          });
      });
  }

  protected async generateConstantIteration<P extends keyof TruffleContractConstantIteratorMethods<CI>>(
    lengthFn: () => Promise<number>,
    getter: (i: number) => Promise<CI[P][0]>
  ): Promise<CI[P]> {

    const length = await lengthFn();
    return await Promise.all(
      Array.from(new Array(+length))
        .map((_, i) => getter(i)),
    );
  }

  protected generateAction<P extends keyof TruffleContractActionMethods<A>>(action: P): ((...args) => Promise<Tx>) & {sync: (...args) => Promise<string>} {
    const fn: any = (...args) => (<any>this.contract)[action](...args, {from: this.web3Service.account});
    fn.sync = (...args) => (<any>this.contract)[action].sendTransaction(...args, {from: this.web3Service.account});
    return fn;
  }

  protected generateEventObservable<P extends keyof TruffleContractEventMethods<E>>(event: P): Observable<E[P]> {
    return this.onInitialized
      .mergeMap(() =>
        Observable
          .create(observer => (<any>this.contract)[event]().watch((e, _) => observer.next(_.args)))
          .share(),
      );
  }
}
