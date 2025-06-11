import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectItem, SelectContent, SelectValue } from "@/components/ui/select";
import { Search, History } from "lucide-react";

const SearchBar = ({ onSearch }) => {
  const [dataSource, setDataSource] = useState("");
  const [provider, setProvider] = useState("");
  const [keyword, setKeyword] = useState("");
  const [history, setHistory] = useState([]);

  const handleDataSourceChange = (value) => {
    setDataSource(value);
    setProvider(value === "s3" ? "AWS" : "Azure");
  };

  const handleSearch = () => {
    if (!keyword || !dataSource) return;
    const newHistory = [keyword, ...history.filter(k => k !== keyword)].slice(0, 5);
    setHistory(newHistory);
    onSearch({ dataSource, provider, keyword });
  };

  return (
    <Card className="p-4 shadow-xl rounded-2xl">
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Select datasource */}
        <div>
          <label className="text-sm font-semibold">Datasource</label>
          <Select onValueChange={handleDataSourceChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select datasource" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="s3">AWS S3</SelectItem>
              <SelectItem value="blob">Azure Blob</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Keyword input */}
        <div>
          <label className="text-sm font-semibold">Keyword</label>
          <Input
            placeholder="Search sensitive data..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        {/* Search button */}
        <div className="flex items-end">
          <Button onClick={handleSearch} className="w-full flex gap-2">
            <Search size={16} /> Search
          </Button>
        </div>
      </CardContent>

      {/* Search history */}
      {history.length > 0 && (
        <div className="mt-4 px-4">
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <History size={14} /> Recent keywords:
          </div>
          <div className="flex gap-2 mt-1 flex-wrap">
            {history.map((item, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => {
                  setKeyword(item);
                  onSearch({ dataSource, provider, keyword: item });
                }}
              >
                {item}
              </Button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default SearchBar;
