import Foundation

struct AuthUser: Codable {
    let id: String?
    let uid: String?
    let phone: String?
    let name: String?
    let nickname: String?

    var effectiveID: String? {
        if let uid, !uid.isEmpty { return uid }
        if let id, !id.isEmpty { return id }
        return phone
    }

    var displayName: String? {
        if let nickname, !nickname.isEmpty { return nickname }
        if let name, !name.isEmpty { return name }
        return nil
    }
}

struct AuthLoginResponse: Codable {
    let success: Bool?
    let token: String?
    let refreshToken: String?
    let expiresIn: Double?
    let user: AuthUser?
    let needRegister: Bool?
    let error: String?
    let message: String?
}

struct SMSCodeResponse: Codable {
    let success: Bool?
    let message: String?
    let error: String?
    let needCaptcha: Bool?
}

struct RegisterResponse: Codable {
    let success: Bool?
    let message: String?
    let error: String?
}

struct RefreshTokenResponse: Codable {
    let success: Bool?
    let token: String?
    let refreshToken: String?
    let expiresIn: Double?
}
