import { useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  updateUserProfile,
  uploadUserAvatar,
} from "@/services/dashboardSupabaseService";

import { PolicyLinks } from "@/legal/PolicyLinks";

import "./LandlordSettings.css";

export const LandlordSettings = () => {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  const fullName = (user?.name || "").trim();
  const [profile, setProfile] = useState({
    avatar: user?.avatar || "",
    name: fullName || "Landlord",
    email: user?.email || "",
  });
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const firstLetter =
    (profile.name || user?.name || "L")
      .trim()
      .charAt(0)
      .toUpperCase() || "L";

  const handleUploadPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    try {
      setIsUploadingPhoto(true);
      const avatarUrl = await uploadUserAvatar(user.id, file);
      const updated = await updateUserProfile({
        id: user.id,
        email: user.email,
        name: user.name || profile.name,
        role: user.role,
        avatar_url: avatarUrl,
      });

      if (updated) {
        setProfile((previous) => ({
          ...previous,
          avatar: avatarUrl,
        }));

        if (updateUser) {
          await updateUser(user.id, { avatar_url: avatarUrl });
        }
      }

      toast.success("Profile photo updated.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to upload profile photo."
      );
    } finally {
      setIsUploadingPhoto(false);
      event.target.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    if (!user?.id || !profile.avatar) return;

    try {
      await updateUserProfile({
        id: user.id,
        email: user.email,
        name: user.name || profile.name,
        role: user.role,
        avatar_url: "",
      });

      setProfile((previous) => ({
        ...previous,
        avatar: "",
      }));

      if (updateUser) {
        await updateUser(user.id, { avatar_url: "" });
      }

      toast.success("Profile photo removed.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to remove profile photo."
      );
    }
  };

  return (
    <div className="landlord-settings">
      <div className="settings-section-card">
        <div className="settings-section-row">
          <div>
            <h1 className="settings-section-settings">Settings</h1>
            <p className="settings-section-text">
              Manage your account, preferences, business information, and security.
            </p>
          </div>
        </div>
      </div>

      <div className="settings-section-scroll">
        <div className="settings-section-stack">
          <section className="settings-panel settings-profile-panel">
            <div className="settings-profile-header">
              <div className="settings-avatar">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="Profile" className="settings-avatar-image" />
                ) : (
                  firstLetter
                )}
              </div>

              <div className="settings-profile-meta">
                <div className="settings-profile-name">{profile.name}</div>
                <div className="settings-profile-email">{profile.email}</div>
              </div>

              <div className="settings-profile-actions">
                <button
                  type="button"
                  className="settings-primary-button settings-upload-button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                >
                  {isUploadingPhoto ? "Uploading..." : "Upload Photo"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="settings-photo-input"
                  onChange={handleUploadPhoto}
                />
                <button
                  type="button"
                  className="settings-secondary-button settings-remove-button"
                  onClick={handleRemovePhoto}
                  disabled={!profile.avatar || isUploadingPhoto}
                >
                  Remove Photo
                </button>
              </div>
            </div>
          </section>

          <section className="settings-panel">
            <div className="settings-panel-header">
              <h2>Personal Information</h2>
            </div>

            <div className="settings-form-grid">
              <label className="settings-field">
                <span>First Name</span>
                <input type="text" value="Kurt" readOnly />
              </label>

              <label className="settings-field">
                <span>Last Name</span>
                <input type="text" value="De Asis" readOnly />
              </label>

              <label className="settings-field full-width">
                <span>Email Address</span>
                <input type="email" value="kurtdeasis@gmail.com" readOnly />
              </label>

              <label className="settings-field full-width">
                <span>Mobile Number</span>
                <input type="tel" value="09000000000" readOnly />
              </label>
            </div>

            <div className="settings-actions-row">
              <button type="button" className="settings-secondary-button">
                Cancel
              </button>
              <button type="button" className="settings-primary-button">
                Save Changes
              </button>
            </div>
          </section>

          <section className="settings-panel">
            <div className="settings-panel-header">
              <h2>Business Information</h2>
            </div>

            <div className="settings-form-grid compact-grid">
              <label className="settings-field">
                <span>Business / Trade Name</span>
                <input type="text" value="Kurt De Asis" readOnly />
              </label>

              <label className="settings-field">
                <span>Business Type</span>
                <input type="text" value="Sole Proprietor" readOnly />
              </label>

              <label className="settings-field">
                <span>Years in Operation</span>
                <input type="text" value="2" readOnly />
              </label>

              <label className="settings-field">
                <span>BIR TIN</span>
                <input type="text" value="123-456-789-000" readOnly />
              </label>
            </div>
          </section>

          <section className="settings-panel">
            <div className="settings-panel-header">
              <h2>Change Password</h2>
              <p>Update your password to keep your landlord account secure.</p>
            </div>

            <div className="settings-password-grid">
              <label className="settings-field full-width">
                <span>Current Password</span>
                <input type="password" value="••••••••" readOnly />
              </label>

              <label className="settings-field full-width">
                <span>New Password</span>
                <input type="password" value="••••••••" readOnly />
              </label>

              <label className="settings-field full-width">
                <span>Confirm New Password</span>
                <input type="password" value="••••••••" readOnly />
              </label>
            </div>

            <div className="settings-actions-row">
              <button type="button" className="settings-secondary-button">
                Cancel
              </button>
              <button type="button" className="settings-primary-button">
                Update Password
              </button>
            </div>
          </section>

          <section className="settings-panel landlord-settings-legal">
            <PolicyLinks
              audience="landlord"
              title="Terms & Privacy"
              description="Open the landlord Terms of Service or Privacy Policy in a popup."
            />
          </section>

          <section className="settings-panel settings-danger-zone">
            <div className="settings-panel-header danger-header">
              <h2>Danger Zone</h2>
            </div>

            <p>
              Delete Account. This action is permanent and cannot be undone.
            </p>

            <div className="settings-danger-actions">
              <button type="button" className="settings-danger-button">
                Delete Account
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
