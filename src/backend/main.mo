import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";



actor {
  include MixinStorage();

  // Authorization state
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profile Management
  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query func getUserProfile(_user : Principal) : async ?UserProfile {
    null;
  };

  public shared ({ caller }) func saveCallerUserProfile(_profile : UserProfile) : async () {
    Runtime.trap("Users cannot be saved in this project yet. It is only a feature placeholder.");
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
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

  // Trip Document Type
  public type TripDocument = {
    id : Nat;
    title : Text;
    docDate : Nat;
    note : Text;
    fileId : Storage.ExternalBlob;
    createdAt : Int;
  };

  let entries = Map.empty<Nat, TripEntry>();
  var nextEntryId : Nat = 0;

  let documents = Map.empty<Nat, TripDocument>();
  var nextDocId : Nat = 0;

  // Compare TripEntries for sorting
  func compareTripEntries(a : TripEntry, b : TripEntry) : Order.Order {
    switch (Nat.compare(a.visitDate, b.visitDate)) {
      case (#equal) { Nat.compare(a.order, b.order) };
      case (order) { order };
    };
  };

  // Compare TripDocuments by docDate
  func compareTripDocumentsByDate(a : TripDocument, b : TripDocument) : Order.Order {
    Nat.compare(a.docDate, b.docDate);
  };

  // CRUD for Trip Entries

  public shared ({ caller }) func createEntry(
    placeName : Text,
    visitDate : Nat,
    visitTime : Text,
    description : Text,
    transportMode : Text,
    imageIds : [Storage.ExternalBlob],
  ) : async TripEntry {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create entries");
    };

    let id = nextEntryId;
    nextEntryId += 1;

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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update entries");
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete entries");
    };

    if (not (entries.containsKey(id))) {
      Runtime.trap("Entry not found");
    };

    entries.remove(id);
  };

  public shared ({ caller }) func reorderEntries(newOrder : [Nat]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can reorder entries");
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

  // CRUD for Trip Documents

  public shared ({ caller }) func createDocument(
    title : Text,
    docDate : Nat,
    note : Text,
    fileId : Storage.ExternalBlob,
  ) : async TripDocument {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create documents");
    };

    let id = nextDocId;
    nextDocId += 1;

    let document : TripDocument = {
      id;
      title;
      docDate;
      note;
      fileId;
      createdAt = Time.now();
    };

    documents.add(id, document);
    document;
  };

  public query func getDocuments() : async [TripDocument] {
    let docArray = Array.fromIter(documents.values());
    docArray.sort(compareTripDocumentsByDate);
  };

  public shared ({ caller }) func deleteDocument(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete documents");
    };

    if (not (documents.containsKey(id))) {
      Runtime.trap("Document not found");
    };
    documents.remove(id);
  };
};
