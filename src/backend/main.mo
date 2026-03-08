import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
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

  public type UserProfile = {
    name : Text;
  };

  // Persistent User Profiles
  stable let userProfiles = Map.empty<Principal, UserProfile>();

  // Constant admin Principal
  let testAdminPrincipalId = "jstda-k4ttk-dlurj-x7pjw-lzrn2-v7n7j-l6ijs-a3sun-ojkpj-ge4s4-2ae";

  // User Profile Management (stable) - No queries for backward compatibility
  // Security: Add check to allow only admins to fetch other profile or their own
  public shared ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    let isAdmin = caller.toText() == testAdminPrincipalId;
    if (not isAdmin and caller != user) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    let callerText = caller.toText();
    if (
      callerText != "2vxsx-fae" and
      callerText != testAdminPrincipalId
    ) {
      userProfiles.get(caller);
    } else {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    let callerText = caller.toText();
    if (
      callerText != "2vxsx-fae" and
      callerText != testAdminPrincipalId
    ) {
      userProfiles.add(caller, profile);
    } else {
      Runtime.trap("Unauthorized: Only authenticated users can save profiles");
    };
  };

  // Persistent Trip Planner State
  stable let entries = Map.empty<Nat, TripEntry>();
  stable var nextEntryId : Nat = 0;

  stable let documents = Map.empty<Nat, TripDocument>();
  stable var nextDocId : Nat = 0;

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

  // CRUD for Trip Entries (no auth)
  public shared ({ caller }) func createEntry(
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

  public query ({ caller }) func getEntries() : async [TripEntry] {
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

  public shared ({ caller }) func deleteEntry(id : Nat) : async () {
    switch (entries.get(id)) {
      case (null) { Runtime.trap("Entry not found") };
      case (?_) {
        entries.remove(id);
      };
    };
  };

  public shared ({ caller }) func reorderEntries(newOrder : [Nat]) : async () {
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

  // CRUD for Trip Documents (no auth)
  public shared ({ caller }) func createDocument(
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

  public query ({ caller }) func getDocuments() : async [TripDocument] {
    let docArray = Array.fromIter(documents.values());
    docArray.sort(compareTripDocumentsByDate);
  };

  public shared ({ caller }) func deleteDocument(id : Nat) : async () {
    switch (documents.get(id)) {
      case (null) { Runtime.trap("Document not found") };
      case (?_) { documents.remove(id) };
    };
  };
};
