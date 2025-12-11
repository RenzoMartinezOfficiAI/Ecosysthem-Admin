"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HouseStatus = exports.PayType = exports.MemberLabel = exports.MemberStatus = exports.UserRole = void 0;
// AUTH & ROLES
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "ADMIN";
    UserRole["OPERATIONS_MANAGER"] = "OPERATIONS_MANAGER";
    UserRole["HOUSE_LEAD"] = "HOUSE_LEAD";
})(UserRole = exports.UserRole || (exports.UserRole = {}));
var MemberStatus;
(function (MemberStatus) {
    MemberStatus["PENDING"] = "PENDING";
    MemberStatus["ACTIVE"] = "ACTIVE";
    MemberStatus["INACTIVE"] = "INACTIVE";
})(MemberStatus = exports.MemberStatus || (exports.MemberStatus = {}));
var MemberLabel;
(function (MemberLabel) {
    MemberLabel["MEMBER"] = "MEMBER";
    MemberLabel["PATIENT"] = "PATIENT";
    MemberLabel["BOTH"] = "BOTH";
})(MemberLabel = exports.MemberLabel || (exports.MemberLabel = {}));
var PayType;
(function (PayType) {
    PayType["SPONSORED"] = "SPONSORED";
    PayType["SELF_PAY"] = "SELF_PAY";
    PayType["MIXED"] = "MIXED";
})(PayType = exports.PayType || (exports.PayType = {}));
// HOUSES
var HouseStatus;
(function (HouseStatus) {
    HouseStatus["ONLINE"] = "ONLINE";
    HouseStatus["MAINTENANCE"] = "MAINTENANCE";
    HouseStatus["OFFLINE"] = "OFFLINE";
})(HouseStatus = exports.HouseStatus || (exports.HouseStatus = {}));
//# sourceMappingURL=types.js.map