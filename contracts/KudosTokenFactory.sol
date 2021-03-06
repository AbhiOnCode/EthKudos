pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/token/ERC20/BasicToken.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./string-utils.sol";
import "./KudosRouter.sol";
import "./Kudos.structs.sol";
import "./KudosPollFactory.sol";


contract KudosTokenFactory {
  string public version = "0.2";

  function KudosTokenFactory() public { }

  function newKudosToken(
    string _organisationName,
    string _tokenName,
    string _tokenSymbol,
    uint8 _decimalUnits,
    address _routerAddress
  ) public returns (address kudosTokenAddress) {
    address kudosToken = new KudosToken(
      _organisationName,
      _tokenName,
      _tokenSymbol,
      _decimalUnits,
      _routerAddress
    );
    KudosToken(kudosToken).transferOwnership(msg.sender);
    return kudosToken;
  }
}


contract KudosToken is BasicToken, Ownable {
  string public version = "0.2";

  string public organisationName;

  string public name;
  string public symbol;
  uint8 public decimals;
  uint256 public totalSupply;

  address[] public members;
  mapping (address => string) public contacts;

  address[] public polls;
  bool public isActivePoll = false;

  mapping (address => uint256) balances;
  mapping (address => mapping (address => uint256)) allowed;

  address private routerAddress;

  event AddMember(address indexed member);
  event RemoveMember(address indexed member);
  event NewPoll(address indexed poll);
  event ClosePoll(address indexed poll);

  function KudosToken(
    string _organisationName,
    string _tokenName,
    string _tokenSymbol,
    uint8 _decimalUnits,
    address _routerAddress
  ) public {
    organisationName = _organisationName;
    name = _tokenName;
    symbol = _tokenSymbol;
    decimals = _decimalUnits;

    routerAddress = _routerAddress;
  }

  // Polls
  function newPoll(
    uint256 _kudosByMember,
    uint256 _maxKudosToMember,
    uint256 _minDurationInMinutes
  ) onlyOwner public returns (address) {
    require (!isActivePoll);

    string memory number = uint2str(polls.length + 1);
    address newPollAddress = KudosPollFactory(KudosRouter(routerAddress).getResourceAddress("KudosPollFactory"))
      .newKudosPoll(
        StringUtils.strConcat(name, " - Polling #", number),
        StringUtils.strConcat(symbol, "#", number),
        decimals,
        _kudosByMember,
        _maxKudosToMember,
        _minDurationInMinutes
      );

    polls.push(newPollAddress);
    isActivePoll = true;

    if (members.length > 0) {
      KudosPoll poll = KudosPoll(newPollAddress);
      poll.addMembers(members);
    }

    NewPoll(newPollAddress);

    return newPollAddress;
  }

  function closePoll() onlyOwner public returns (bool) {
    require(isActivePoll);


    KudosPoll currentPoll = KudosPoll(activePoll());
    require(currentPoll.canBeClosed());

    currentPoll.close();
    isActivePoll = false;

    for (uint i = 0; i < currentPoll.getPollResultsSize(); i++) {
      var (member, kudos) = currentPoll.getPollResult(i);
      if (kudos > 0) {
        balances[member] += kudos;
        totalSupply += kudos;
        Transfer(address(0), member, kudos);
      }
    }

    return true;
  }

  function activePoll() public constant returns (address) {
    if (isActivePoll) {
      return polls[polls.length - 1];
    }
  }

  function getPolls() public constant returns (address[]) {
    return polls;
  }

  function getPollsSize() public constant returns (uint256) {
    return polls.length;
  }

  // Organisation name
  function changeOrganisationName(string _newName) onlyOwner public returns (bool) {
    organisationName = _newName;

    return true;
  }

  // Members
  function addMember(address _member, string _contact) onlyOwner public returns (bool) {
    require(!isMember(_member));

    members.push(_member);
    contacts[_member] = _contact;
    AddMember(_member);

    if (isActivePoll) {
      KudosPoll currentPoll = KudosPoll(activePoll());
      if (!currentPoll.isMember(_member)) {
        currentPoll.addMember(_member);
      }
    }

    return true;
  }

  function removeMember(address _member) onlyOwner public returns (bool) {
    require(isMember(_member));

    uint256 index = memberIndex(_member);

    members[index] = members[members.length - 1];
    members.length = members.length - 1;
    RemoveMember(_member);

    return true;
  }

  function isMember(address _member) public constant returns (bool) {
    for (uint i = 0; i < members.length; i++) {
      if (members[i] == _member) {
        return true;
      }
    }
    return false;
  }

  function memberIndex(address _member) public constant returns (uint256) {
    for (uint i = 0; i < members.length; i++) {
      if (members[i] == _member) {
        return i;
      }
    }
  }

  function getMembers() public constant returns (address[]) {
    return members;
  }

  function getMember(uint256 _index) public constant returns (address) {
    return members[_index];
  }

  function membersNumber() public constant returns (uint256) {
    return members.length;
  }

  // Contacts
  function editContact(address _member, string _contact) onlyOwner public returns (bool) {
    require(isMember(_member));

    contacts[_member] = _contact;

    return true;
  }

  function getContact(address _member) public constant returns (string) {
    if (isMember(_member)) {
      return contacts[_member];
    }
  }

  // Transfers
  function transfer(address _to, uint256 _value) public returns (bool) {
    require(false && _to == 0x0 && _value == 0);
  }

  function balanceOf(address _owner) public constant returns (uint256 balance) {
    return balances[_owner];
  }

  // Utils
  function uint2str(uint i) internal pure returns (string) {
    if (i == 0) return "0";
    uint j = i;
    uint length;
    while (j != 0){
      length++;
      j /= 10;
    }
    bytes memory bstr = new bytes(length);
    uint k = length - 1;
    while (i != 0){
      bstr[k--] = byte(48 + i % 10);
      i /= 10;
    }
    return string(bstr);
  }
}
