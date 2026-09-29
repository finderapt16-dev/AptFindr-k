import "./AdminLandlordVerification.css";

import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "verified", label: "Verified" },
  { value: "pending", label: "Pending Review" },
  { value: "rejected", label: "Rejected" },
];

const getVerificationState = (landlord) => {
  if (landlord?.isVerified === true || landlord?.is_verified === true) {
    return "verified";
  }

  const status = String(
    landlord?.landlord_status ??
      landlord?.verification_status ??
      landlord?.status ??
      ""
  )
    .trim()
    .toLowerCase();

  return ["rejected", "denied", "declined"].includes(status)
    ? "rejected"
    : "pending";
};

const getLandlordName = (landlord) =>
  String(landlord?.name ?? landlord?.full_name ?? "Unnamed landlord");

const getContact = (landlord) =>
  String(
    landlord?.phone ??
      landlord?.contact ??
      landlord?.mobile ??
      landlord?.mobileNumber ??
      "—"
  );

const getPermitNumber = (landlord) =>
  String(
    landlord?.permit_number ??
      landlord?.permitNumber ??
      landlord?.business_permit_number ??
      "—"
  );

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
};

export function AdminLandlordVerification({
  landlords,
  onViewVerification,
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [page, setPage] = useState(1);
  const statusMenuRef = useRef(null);

  useEffect(() => {
    const closeStatusMenu = (event) => {
      if (!statusMenuRef.current?.contains(event.target)) {
        setIsStatusMenuOpen(false);
      }
    };

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsStatusMenuOpen(false);
    };

    document.addEventListener("mousedown", closeStatusMenu);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeStatusMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const counts = useMemo(() => {
    const values = { total: landlords.length, pending: 0, verified: 0, rejected: 0 };

    landlords.forEach((landlord) => {
      values[getVerificationState(landlord)] += 1;
    });

    return values;
  }, [landlords]);

  const filteredLandlords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return landlords.filter((landlord) => {
      const matchesStatus = status === "all" || getVerificationState(landlord) === status;
      const searchableValues = [
        getLandlordName(landlord),
        landlord?.email,
        getContact(landlord),
        getPermitNumber(landlord),
      ];
      const matchesSearch =
        !query ||
        searchableValues.some((value) =>
          String(value ?? "").toLowerCase().includes(query)
        );

      return matchesStatus && matchesSearch;
    });
  }, [landlords, search, status]);

  const pageCount = Math.max(1, Math.ceil(filteredLandlords.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleLandlords = filteredLandlords.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  const selectedStatus = STATUS_OPTIONS.find((option) => option.value === status);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const selectStatus = (value) => {
    setStatus(value);
    setIsStatusMenuOpen(false);
  };

  return (
    <div className="admin-verification-page">
      <header className="admin-verification-header">
        <h1>Landlord Verification</h1>
        <p>Review landlord accounts and verification status.</p>
      </header>

      <div className="admin-verification-controls">
        <label className="admin-verification-search">
          <Search aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search apartments"
            type="search"
          />
        </label>

        <div className="admin-verification-status-filter" ref={statusMenuRef}>
          <button
            aria-expanded={isStatusMenuOpen}
            aria-haspopup="listbox"
            className="admin-verification-status-trigger"
            onClick={() => setIsStatusMenuOpen((open) => !open)}
            type="button"
          >
            <span>{selectedStatus?.label ?? "All Status"}</span>
            <ChevronDown aria-hidden="true" />
          </button>

          {isStatusMenuOpen && (
            <div className="admin-verification-status-menu" role="listbox">
              {STATUS_OPTIONS.map((option) => (
                <button
                  aria-selected={status === option.value}
                  key={option.value}
                  onClick={() => selectStatus(option.value)}
                  role="option"
                  type="button"
                >
                  <span>{option.label}</span>
                  {status === option.value && <Check aria-hidden="true" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <section className="admin-verification-statistics" aria-label="Verification summary">
        {[
          { label: "Total Landlords", note: "Registered landlord accounts", value: counts.total, icon: UserRound, tone: "total" },
          { label: "Pending Review", note: "Awaiting verification", value: counts.pending, icon: Clock3, tone: "pending" },
          { label: "Verified", note: "Approved landlord accounts", value: counts.verified, icon: CheckCircle2, tone: "verified" },
          { label: "Rejected", note: "Verification denied", value: counts.rejected, icon: X, tone: "rejected" },
        ].map(({ label, note, value, icon: Icon, tone }) => (
          <article className="admin-verification-stat" key={label}>
            <span className={`admin-verification-stat-icon ${tone}`}>
              <Icon aria-hidden="true" />
            </span>
            <strong>{value} {label}</strong>
            <span>{note}</span>
          </article>
        ))}
      </section>

      <section className="admin-verification-table-panel">
        <div className="admin-verification-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Landlord</th>
                <th>Contact</th>
                <th>Date Registered</th>
                <th>Permit Number</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleLandlords.map((landlord) => {
                const name = getLandlordName(landlord);
                const verificationState = getVerificationState(landlord);

                return (
                  <tr key={landlord.id}>
                    <td>
                      <div className="admin-verification-landlord">
                        <span aria-hidden="true" className="admin-verification-avatar">
                          {name.charAt(0).toUpperCase()}
                        </span>
                        <span>
                          <strong>{name}</strong>
                          <small>{landlord.email || "No email provided"}</small>
                        </span>
                      </div>
                    </td>
                    <td>{getContact(landlord)}</td>
                    <td>{formatDate(landlord.created_at ?? landlord.createdAt)}</td>
                    <td>{getPermitNumber(landlord)}</td>
                    <td>
                      <span className={`admin-verification-badge ${verificationState}`}>
                        {verificationState === "pending"
                          ? "Pending"
                          : verificationState.charAt(0).toUpperCase() + verificationState.slice(1)}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`admin-verification-view-button ${verificationState === "pending" ? "pending" : ""}`}
                        onClick={() => onViewVerification(landlord)}
                        type="button"
                      >
                        View Verification
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {visibleLandlords.length === 0 && (
            <p className="admin-verification-empty">No landlords match the selected filters.</p>
          )}
        </div>

        {filteredLandlords.length > 0 && (
          <nav aria-label="Landlord verification pages" className="admin-verification-pagination">
            <button
              aria-label="Previous page"
              disabled={currentPage === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              type="button"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
              <button
                aria-current={pageNumber === currentPage ? "page" : undefined}
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                type="button"
              >
                {pageNumber}
              </button>
            ))}
            <button
              aria-label="Next page"
              disabled={currentPage === pageCount}
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              type="button"
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </nav>
        )}
      </section>
    </div>
  );
}
