import React, { useState } from "react";
import "./Header.css";

function Header({
  pageTitle,
  searchTerm,
  onSearchChange,
  onLogout,
  showSearch = true,
}) {
  const [isUserProfileDropdownOpen, setIsUserProfileDropdownOpen] =
    useState(false);

  const handleUserProfileClick = () => {
    setIsUserProfileDropdownOpen((prev) => !prev);
  };

  return (
    <div className="header-section">
      <div className="page-title">{pageTitle}</div>
      <div className="header-controls">
        {showSearch && (
          <input
            type="text"
            className="search-input"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        )}
        <div className="user-profile-wrapper">
          <div className="user-profile" onClick={handleUserProfileClick}>
            <div className="user-info">
              <img
                src="https://cdn.builder.io/api/v1/image/assets/TEMP/26f0a624d150c8c02938247753a1054d42060a0b?placeholderIfAbsent=true"
                className="user-avatar"
                alt="User Avatar"
              />
              <div className="user-name">Xuan Tung</div>
            </div>
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/2b743dbcd0157a48cdbb66a0049f7867f7fa50ed?placeholderIfAbsent=true"
              className="user-dropdown-arrow"
              alt="Dropdown"
            />
          </div>
          {isUserProfileDropdownOpen && (
            <div className="user-profile-dropdown">
              <button
                onClick={() => {
                  if (onLogout) {
                    onLogout();
                  }
                  setIsUserProfileDropdownOpen(false);
                }}
                className="dropdown-item logout-button"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Header;
