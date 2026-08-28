import { useEffect, useState } from "react";
import { ID, Permission, Role } from "appwrite";
import { account, storage } from "../appwrite";
import { startRegistration } from "@simplewebauthn/browser";
import Icon from "./Icon";
import ImageCropModal from "./ImageCropModal";

const PROFILE_BUCKET_ID = "6a9002190009924bfb37";

function WelcomeHeader({ user, onLogout, onUserUpdate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(user?.name?.trim() || "User");
  const [newName, setNewName] = useState(user?.name?.trim() || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [profilePicture, setProfilePicture] = useState(
    user?.prefs?.profilePicture || ""
  );
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [cropImage, setCropImage] = useState(null);

  const initial = name.charAt(0).toUpperCase();

  useEffect(() => {
    setName(user?.name?.trim() || "User");
    setNewName(user?.name?.trim() || "");
    setProfilePicture(user?.prefs?.profilePicture || "");
  }, [user]);

  async function handleProfilePictureChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("कृपया केवल image file चुनें।");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Profile picture 5 MB से छोटी होनी चाहिए।");
      return;
    }

    setError("");

    const reader = new FileReader();

    reader.onload = () => {
      setCropImage(reader.result);
      setMenuOpen(false);
    };

    reader.onerror = () => {
      setError("Image पढ़ने में समस्या हुई।");
    };

    reader.readAsDataURL(file);
  }

  async function handleCroppedImage(croppedFile) {
    if (!croppedFile) return;

    setUploadingPicture(true);
    setError("");

    try {
      const uploaded = await storage.createFile(
        PROFILE_BUCKET_ID,
        ID.unique(),
        croppedFile,
        [
          Permission.read(Role.any())
        ]
      );

      const pictureUrl =
        `https://fra.cloud.appwrite.io/v1/storage/buckets/${PROFILE_BUCKET_ID}/files/${uploaded.$id}/view?project=6a6abdb7002586cbab5b&v=${Date.now()}`;

      await account.updatePrefs({
        ...user?.prefs,
        profilePicture: pictureUrl,
      });

      const freshUser = await account.get();

      setProfilePicture(
        freshUser?.prefs?.profilePicture || pictureUrl
      );

      if (onUserUpdate) {
        onUserUpdate(freshUser);
      }

      setCropImage(null);
    } catch (err) {
      console.error("Profile picture upload error:", err);
      setError(err?.message || "Profile picture upload failed.");
    } finally {
      setUploadingPicture(false);
    }
  }

  function handleEditProfile() {
    setNewName(name);
    setError("");
    setMenuOpen(false);
    setEditOpen(true);
  }

  function handleCancel() {
    setNewName(name);
    setError("");
    setEditOpen(false);
  }

  async function handleSave() {
    const cleanName = newName.trim();

    if (!cleanName) {
      setError("नाम खाली नहीं हो सकता।");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const updatedUser = await account.updateName(cleanName);

      setName(updatedUser.name || cleanName);
      setEditOpen(false);
    } catch (err) {
      console.error("Update profile error:", err);
      setError(err?.message || "Profile update failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleBiometricSetup() {
    setMenuOpen(false);
    setError("");

    try {
      if (!window.isSecureContext) {
        alert("Biometric Login ke liye secure HTTPS connection required hai.");
        return;
      }

      if (!window.PublicKeyCredential) {
        alert("Is device/browser me biometric authentication supported nahi hai.");
        return;
      }

      const available =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

      if (!available) {
        alert("Is device me fingerprint/face biometric available nahi hai.");
        return;
      }

      // Ask backend for WebAuthn registration options
      const jwt = sessionStorage.getItem("geminiPumpJWT");

      if (!jwt) {
        alert("Session expired. कृपया दोबारा login करें।");
        return;
      }

      const optionsResponse = await fetch(
        "https://geminipumpai.onrender.com/api/biometric/register/options",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${jwt}`
          }
        }
      );

      const optionsData = await optionsResponse.json();

      if (!optionsResponse.ok || !optionsData.success) {
        throw new Error(
          optionsData.error || "Biometric registration options failed."
        );
      }

      // Trigger Android fingerprint / face prompt
      const registrationResponse =
        await startRegistration({
          optionsJSON: optionsData.options
        });

      // Send signed credential back to backend
      const verifyResponse = await fetch(
        "https://geminipumpai.onrender.com/api/biometric/register/verify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${jwt}`
          },
          body: JSON.stringify(registrationResponse)
        }
      );

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok || !verifyData.success) {
        throw new Error(
          verifyData.error || "Biometric verification failed."
        );
      }

      alert("Biometric Enabled successfully.");

    } catch (err) {
      console.error("Biometric registration error:", err);

      if (
        err?.name === "NotAllowedError" ||
        err?.name === "AbortError"
      ) {
        alert("Biometric setup cancel कर दिया गया।");
        return;
      }

      alert(
        err?.message ||
        "Biometric setup failed."
      );
    }
  }

  async function handleLogout() {
    try {
      await account.deleteSession("current");
    } catch (err) {
      console.log("Logout session error:", err);
    }

    sessionStorage.removeItem("geminiPumpJWT");
    setMenuOpen(false);

    if (onLogout) {
      onLogout();
    }
  }

  return (
    <>
      <div className="welcome-header">
        <div className="welcome-header-text">
          <h2>Welcome, {name}</h2>
        </div>

        <div className="profile-menu-wrapper">
          <input
            id="profile-picture-input"
            type="file"
            accept="image/*"
            onChange={handleProfilePictureChange}
            style={{ display: "none" }}
            disabled={uploadingPicture}
          />

          <button
            type="button"
            className="profile-avatar"
            aria-label="Account Settings"
            onClick={() => setMenuOpen(prev => !prev)}
          >
            {profilePicture ? (
              <img
                src={profilePicture}
                alt="Profile"
                className="profile-avatar-image"
                onError={(e) => {
                  console.error("PROFILE IMAGE LOAD ERROR:", profilePicture);
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              initial
            )}
          </button>

          {menuOpen && (
            <div className="profile-menu">
              <button
                type="button"
                onClick={() =>
                  document.getElementById("profile-picture-input")?.click()
                }
                disabled={uploadingPicture}
              >
                <Icon name="camera" size={19} strokeWidth={2} />
                <span>{uploadingPicture ? "Uploading..." : "Change Profile Picture"}</span>
              </button>

              <button type="button" onClick={handleEditProfile}>
                <Icon name="editProfile" size={19} strokeWidth={2} />
                <span>Edit Profile</span>
              </button>

              <button
                type="button"
                onClick={handleBiometricSetup}
              >
                <Icon name="fingerprint" size={19} strokeWidth={2} />
                <span>Biometric Enabled</span>
              </button>

              <button type="button" onClick={handleLogout}>
                <Icon name="logout" size={19} strokeWidth={2} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {cropImage && (
        <ImageCropModal
          image={cropImage}
          onCancel={() => setCropImage(null)}
          onApply={handleCroppedImage}
        />
      )}

      {editOpen && (
        <div className="edit-profile-overlay">
          <div className="edit-profile-sheet">
            <h3>Edit Profile</h3>

            <label htmlFor="profile-name">Name</label>

            <input
              id="profile-name"
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              autoComplete="name"
              disabled={saving}
            />

            {error && (
              <p className="edit-profile-error">{error}</p>
            )}

            <div className="edit-profile-actions">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default WelcomeHeader;
