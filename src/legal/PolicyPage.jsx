import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { PolicyDocument } from "./PolicyDocument";
import { POLICY_AUDIENCES, policyIdFor, resolveAudience, resolveKind } from "./policyIds";
import { loadPolicy } from "./policyLoader";
import {
  POLICY_CONTACT_EMAIL,
  POLICY_CONTEXT,
  POLICY_KIND_LABEL,
  POLICY_ROUTES,
  formatPolicyUpdated,
} from "./policyMeta";

/**
 * The public, linkable policy page.
 *
 * Unlike the popup, this is a real route with a real URL, which is what
 * Supabase (and app-store review) require in their "Application privacy
 * policy link" and "Application terms of service link" fields. It must render
 * without an account and without a network round-trip beyond the app itself.
 *
 * The tenant and landlord versions differ, but only one URL can be submitted
 * to Supabase, so the audience is a switcher that lives in the query string
 * (`?audience=landlord`) - a shared link always opens the same version.
 */

const AUDIENCE_LABEL = { tenant: "For Tenants", landlord: "For Landlords" };

function useDocumentMeta(title, description) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    let tag = document.querySelector('meta[name="description"]');
    let created = false;
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute("name", "description");
      document.head.appendChild(tag);
      created = true;
    }
    const previousContent = tag.getAttribute("content");
    tag.setAttribute("content", description);

    return () => {
      document.title = previousTitle;
      if (created) tag.remove();
      else if (previousContent != null) tag.setAttribute("content", previousContent);
    };
  }, [title, description]);
}

export function PolicyPage({ kind }) {
  const resolvedKind = resolveKind(kind);
  const [searchParams, setSearchParams] = useSearchParams();
  const audience = resolveAudience(searchParams.get("audience"));
  const policyId = policyIdFor(audience, resolvedKind);

  const [policy, setPolicy] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setPolicy(null);
    setFailed(false);
    loadPolicy(policyId)
      .then((loaded) => {
        if (!active) return;
        if (loaded) setPolicy(loaded);
        else setFailed(true);
      })
      .catch((error) => {
        console.error("[LEGAL] Unable to load public policy", error);
        if (active) setFailed(true);
      });
    return () => { active = false; };
  }, [policyId]);

  const kindLabel = POLICY_KIND_LABEL[resolvedKind];
  const description = useMemo(() => (
    `Read the AptFindr ${kindLabel.toLowerCase()} for ${AUDIENCE_LABEL[audience].replace("For ", "").toLowerCase()} in ${POLICY_CONTEXT}.`
  ), [kindLabel, audience]);

  useDocumentMeta(`${kindLabel} - AptFindr`, description);

  const selectAudience = (next) => {
    if (next === audience) return;
    setSearchParams(next === "tenant" ? {} : { audience: next }, { replace: true });
  };

  return (
    <div className="apf-legal-page">
      <header className="apf-legal-topbar">
        <div className="apf-legal-topbar-inner">
          <Link to="/" className="apf-legal-brand">
            <AppLogo className="apf-legal-logo" />
            <span>AptFindr</span>
          </Link>
          <Link to="/" className="apf-legal-back">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Back to home</span>
          </Link>
        </div>
      </header>

      <main className="apf-legal-main">
        <article className="apf-legal-card">
          <h1 className="apf-legal-title">{kindLabel}</h1>
          <p className="apf-legal-updated">
            Last updated <time dateTime={formatPolicyUpdated()}>{formatPolicyUpdated()}</time>
          </p>

          <nav className="apf-legal-switch" aria-label="Choose which version of this document to read">
            {POLICY_AUDIENCES.map((option) => (
              <a
                key={option}
                href={option === "tenant" ? POLICY_ROUTES[resolvedKind] : `${POLICY_ROUTES[resolvedKind]}?audience=${option}`}
                className={option === audience ? "apf-legal-switch-link is-active" : "apf-legal-switch-link"}
                aria-current={option === audience ? "page" : undefined}
                onClick={(event) => {
                  // Plain in-page switch: keep it instant and preserve the scroll
                  // position, but still leave a real href for middle-click and
                  // for anyone reading the link.
                  event.preventDefault();
                  selectAudience(option);
                }}
              >
                {AUDIENCE_LABEL[option]}
              </a>
            ))}
          </nav>

          {policy ? (
            <div className="apf-legal-body apf-policy-scroll-reset">
              <PolicyDocument policy={policy} />
            </div>
          ) : failed ? (
            <p className="apf-legal-error">
              This document could not be loaded. Please refresh the page, or email us at{" "}
              <a href={`mailto:${POLICY_CONTACT_EMAIL}`}>{POLICY_CONTACT_EMAIL}</a>.
            </p>
          ) : (
            <div className="apf-policy-skeleton" aria-hidden="true">
              {[92, 84, 78, 90, 66, 86, 74, 88, 60].map((width, index) => (
                <span key={index} className="apf-policy-skeleton-line" style={{ width: `${width}%` }} />
              ))}
            </div>
          )}

          <section className="apf-legal-contact">
            <h2 className="apf-legal-contact-title">Questions about this document?</h2>
            <p className="apf-legal-contact-text">
              <Mail size={16} aria-hidden="true" />
              <a href={`mailto:${POLICY_CONTACT_EMAIL}`}>{POLICY_CONTACT_EMAIL}</a>
            </p>
          </section>
        </article>
      </main>

      <footer className="apf-legal-footer">
        <nav className="apf-legal-footer-nav" aria-label="Legal documents">
          <Link to={POLICY_ROUTES.terms}>Terms of Service</Link>
          <Link to={POLICY_ROUTES.privacy}>Privacy Policy</Link>
          <Link to="/">Home</Link>
        </nav>
        <p className="apf-legal-footer-note">
          {kindLabel} for {AUDIENCE_LABEL[audience].replace("For ", "")} &middot; {POLICY_CONTEXT}
        </p>
      </footer>
    </div>
  );
}

export function PrivacyPolicyPage() {
  return <PolicyPage kind="privacy" />;
}

export function TermsOfServicePage() {
  return <PolicyPage kind="terms" />;
}
