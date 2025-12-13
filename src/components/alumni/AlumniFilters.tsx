"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Button, Select } from "@/components/ui";

interface FilterOption {
  value: string;
  label: string;
}

interface AlumniFiltersProps {
  years: (number | null)[];
  industries: (string | null)[];
  companies: (string | null)[];
  cities: (string | null)[];
  positions: (string | null)[];
}

export function AlumniFilters({
  years,
  industries,
  companies,
  cities,
  positions,
}: AlumniFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState({
    year: searchParams.get("year") || "",
    industry: searchParams.get("industry") || "",
    company: searchParams.get("company") || "",
    city: searchParams.get("city") || "",
    position: searchParams.get("position") || "",
  });

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  const updateURL = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.year) params.set("year", filters.year);
    if (filters.industry) params.set("industry", filters.industry);
    if (filters.company) params.set("company", filters.company);
    if (filters.city) params.set("city", filters.city);
    if (filters.position) params.set("position", filters.position);

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }, [filters, pathname, router]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      updateURL();
    }, 300);
    return () => clearTimeout(debounce);
  }, [filters, updateURL]);

  const clearFilters = () => {
    setFilters({
      year: "",
      industry: "",
      company: "",
      city: "",
      position: "",
    });
  };

  const yearOptions: FilterOption[] = [
    { value: "", label: "All Years" },
    ...years
      .filter((y): y is number => y !== null)
      .sort((a, b) => b - a)
      .map((y) => ({ value: y.toString(), label: `Class of ${y}` })),
  ];

  const industryOptions: FilterOption[] = [
    { value: "", label: "All Industries" },
    ...industries
      .filter((i): i is string => i !== null && i.trim() !== "")
      .sort()
      .map((i) => ({ value: i, label: i })),
  ];

  const companyOptions: FilterOption[] = [
    { value: "", label: "All Companies" },
    ...companies
      .filter((c): c is string => c !== null && c.trim() !== "")
      .sort()
      .map((c) => ({ value: c, label: c })),
  ];

  const cityOptions: FilterOption[] = [
    { value: "", label: "All Cities" },
    ...cities
      .filter((c): c is string => c !== null && c.trim() !== "")
      .sort()
      .map((c) => ({ value: c, label: c })),
  ];

  const positionOptions: FilterOption[] = [
    { value: "", label: "All Positions" },
    ...positions
      .filter((p): p is string => p !== null && p.trim() !== "")
      .sort()
      .map((p) => ({ value: p, label: p })),
  ];

  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-auto sm:flex-1 sm:min-w-[140px]">
          <Select
            label="Graduation Year"
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            options={yearOptions}
          />
        </div>
        <div className="w-full sm:w-auto sm:flex-1 sm:min-w-[140px]">
          <Select
            label="Industry"
            value={filters.industry}
            onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
            options={industryOptions}
          />
        </div>
        <div className="w-full sm:w-auto sm:flex-1 sm:min-w-[140px]">
          <Select
            label="Company"
            value={filters.company}
            onChange={(e) => setFilters({ ...filters, company: e.target.value })}
            options={companyOptions}
          />
        </div>
        <div className="w-full sm:w-auto sm:flex-1 sm:min-w-[140px]">
          <Select
            label="City"
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
            options={cityOptions}
          />
        </div>
        <div className="w-full sm:w-auto sm:flex-1 sm:min-w-[140px]">
          <Select
            label="Position"
            value={filters.position}
            onChange={(e) => setFilters({ ...filters, position: e.target.value })}
            options={positionOptions}
          />
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <svg
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}

