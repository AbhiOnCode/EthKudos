import { Injectable } from '@angular/core';
import { Web3Service } from './web3.service';

import { KudosTokenService } from './kudos-token.service';
import { KudosPollFactoryService } from './kudos-poll-factory.service';

@Injectable()
export class KudosTokenFactoryService {
  private kudosTokenInstances: {[address: string]: KudosTokenService} = {};

  constructor(private web3Service: Web3Service, private kudosPollFactoryService: KudosPollFactoryService) { }

  getKudosTokenServiceAt(address: string): KudosTokenService {
    if (+address === 0) {
      return;
    }
    if (this.kudosTokenInstances[address]) {
      return this.kudosTokenInstances[address];
    }
    const kudosTokenService = new KudosTokenService(this.web3Service, this.kudosPollFactoryService);
    kudosTokenService.initAt(address);
    this.kudosTokenInstances[address] = kudosTokenService;
    return kudosTokenService;
  }
}
