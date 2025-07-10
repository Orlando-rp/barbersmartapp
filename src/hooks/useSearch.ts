import { useState, useMemo } from "react";

interface UseSearchProps<T> {
  data: T[];
  searchFields: (keyof T)[];
  filterFunction?: (item: T, filters: Record<string, string>) => boolean;
}

export const useSearch = <T>({ data, searchFields, filterFunction }: UseSearchProps<T>) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  const filteredData = useMemo(() => {
    let result = data;

    // Apply search filter
    if (searchQuery) {
      result = result.filter(item =>
        searchFields.some(field => {
          const value = item[field];
          return String(value).toLowerCase().includes(searchQuery.toLowerCase());
        })
      );
    }

    // Apply custom filters
    if (Object.keys(filters).length > 0 && filterFunction) {
      result = result.filter(item => filterFunction(item, filters));
    }

    return result;
  }, [data, searchQuery, filters, searchFields, filterFunction]);

  return {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    filteredData,
    resultCount: filteredData.length,
    totalCount: data.length
  };
};