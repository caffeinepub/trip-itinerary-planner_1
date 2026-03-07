import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Order "mo:core/Order";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";

actor {
  include MixinStorage();

  // Initialize the user system state
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profile Management
  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Trip Entry Types and Data
  public type TransportMode = {
    #flight;
    #train;
    #bus;
    #car;
    #taxi;
    #walk;
    #boat;
    #other;
  };

  public type TripEntry = {
    id : Nat;
    placeName : Text;
    visitDate : Nat;
    visitTime : Text;
    description : Text;
    transportMode : Text;
    imageIds : [Storage.ExternalBlob];
    order : Nat;
    createdAt : Int;
    updatedAt : Int;
  };

  let entries = Map.empty<Nat, TripEntry>();
  var nextId : Nat = 0;

  // Helper function to compare trip entries for sorting
  func compareTripEntries(a : TripEntry, b : TripEntry) : Order.Order {
    switch (Nat.compare(a.visitDate, b.visitDate)) {
      case (#equal) { Nat.compare(a.order, b.order) };
      case (order) { order };
    };
  };

  // CRUD Operations for Trip Entries

  public shared ({ caller }) func createEntry(
    placeName : Text,
    visitDate : Nat,
    visitTime : Text,
    description : Text,
    transportMode : Text,
    imageIds : [Storage.ExternalBlob],
  ) : async TripEntry {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can create entries");
    };

    let id = nextId;
    nextId += 1;

    let entry : TripEntry = {
      id;
      placeName;
      visitDate;
      visitTime;
      description;
      transportMode;
      imageIds;
      order = entries.size();
      createdAt = Time.now();
      updatedAt = Time.now();
    };

    entries.add(id, entry);
    entry;
  };

  public query func getEntries() : async [TripEntry] {
    // No authorization check - anyone can read entries (for sharing)
    let entryArray = Array.fromIter(entries.values());
    entryArray.sort(compareTripEntries);
  };

  public shared ({ caller }) func updateEntry(
    id : Nat,
    placeName : Text,
    visitDate : Nat,
    visitTime : Text,
    description : Text,
    transportMode : Text,
    imageIds : [Storage.ExternalBlob],
  ) : async TripEntry {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can update entries");
    };

    switch (entries.get(id)) {
      case (null) { Runtime.trap("Entry not found") };
      case (?existing) {
        let updated : TripEntry = {
          id;
          placeName;
          visitDate;
          visitTime;
          description;
          transportMode;
          imageIds;
          order = existing.order;
          createdAt = existing.createdAt;
          updatedAt = Time.now();
        };
        entries.add(id, updated);
        updated;
      };
    };
  };

  public shared ({ caller }) func deleteEntry(id : Nat) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can delete entries");
    };

    if (not (entries.containsKey(id))) {
      Runtime.trap("Entry not found");
    };

    entries.remove(id);
  };

  public shared ({ caller }) func reorderEntries(newOrder : [Nat]) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can reorder entries");
    };

    for (i in newOrder.keys()) {
      let id = newOrder[i];
      switch (entries.get(id)) {
        case (null) {};
        case (?entry) {
          let updated : TripEntry = {
            id = entry.id;
            placeName = entry.placeName;
            visitDate = entry.visitDate;
            visitTime = entry.visitTime;
            description = entry.description;
            transportMode = entry.transportMode;
            imageIds = entry.imageIds;
            order = i;
            createdAt = entry.createdAt;
            updatedAt = Time.now();
          };
          entries.add(id, updated);
        };
      };
    };
  };
};
