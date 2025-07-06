export const clearSearchSession = () => {
  // Clear search-related localStorage
  const searchKeys = [
    "searchType",
    "searchTerm",
    "filePath",
    "scanLevel",
    "currentRunId",
    "scanStatus",
    "scanStatusMessage",
    "scanResults",
    "searchFound",
  ];

  searchKeys.forEach(key => {
    localStorage.removeItem(key);
  });
}
