import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";



actor {
  // Blob Storage + Authorization
  include MixinStorage();

  // Authorization state
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profile Management
  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

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

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  // Trip Planner Types
  public type TripEntry = {
    id : Nat;
    placeName : Text;
    visitDate : Nat; // Timestamp
    visitTime : Text;
    description : Text;
    transportMode : Text;
    venueType : Text;
    imageIds : [Storage.ExternalBlob];
    order : Nat;
    createdAt : Int;
    updatedAt : Int;
  };

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

  // Helper: Entry Comparison
  func compareTripEntries(a : TripEntry, b : TripEntry) : Order.Order {
    switch (Nat.compare(a.visitDate, b.visitDate)) {
      case (#equal) { Nat.compare(a.order, b.order) };
      case (order) { order };
    };
  };

  // Helper: Document Comparison
  func compareTripDocumentsByDate(a : TripDocument, b : TripDocument) : Order.Order {
    Nat.compare(a.docDate, b.docDate);
  };

  // CRUD for Trip Entries (open to all callers - no auth required)

  public shared func createEntry(
    placeName : Text,
    visitDate : Nat,
    visitTime : Text,
    description : Text,
    transportMode : Text,
    venueType : Text,
    imageIds : [Storage.ExternalBlob],
  ) : async TripEntry {
    let id = nextEntryId;
    nextEntryId += 1;

    let entry : TripEntry = {
      id;
      placeName;
      visitDate;
      visitTime;
      description;
      transportMode;
      venueType;
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

  public shared func updateEntry(
    id : Nat,
    placeName : Text,
    visitDate : Nat,
    visitTime : Text,
    description : Text,
    transportMode : Text,
    venueType : Text,
    imageIds : [Storage.ExternalBlob],
  ) : async TripEntry {
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
          venueType;
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

  public shared func deleteEntry(id : Nat) : async () {
    if (not (entries.containsKey(id))) {
      Runtime.trap("Entry not found");
    };
    entries.remove(id);
  };

  public shared func reorderEntries(newOrder : [Nat]) : async () {
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
            venueType = entry.venueType;
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

  // CRUD for Trip Documents (open to all callers - no auth required)

  public shared func createDocument(
    title : Text,
    docDate : Nat,
    note : Text,
    fileId : Storage.ExternalBlob,
  ) : async TripDocument {
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

  public shared func deleteDocument(id : Nat) : async () {
    if (not (documents.containsKey(id))) {
      Runtime.trap("Document not found");
    };
    documents.remove(id);
  };
};
