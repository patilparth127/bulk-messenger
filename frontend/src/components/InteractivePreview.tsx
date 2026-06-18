import React from "react";
import { WhatsAppTemplate } from "../types";

interface Props {
  template: Partial<WhatsAppTemplate>;
}

export default function InteractivePreview({ template }: Props) {
  return (
    <div className="wa-preview-container">
      <div className="wa-preview-header">
        <span>WhatsApp Preview</span>
      </div>
      <div className="wa-preview-body-wrapper">
        <div className="wa-message-bubble">
          {template.header && (
            <div className="wa-message-header">{template.header}</div>
          )}
          <div className="wa-message-body">{template.body || "Message body..."}</div>
          {template.footer && (
            <div className="wa-message-footer">{template.footer}</div>
          )}

          {template.type === "poll" && template.pollOptions && template.pollOptions.length > 0 && (
            <div className="wa-poll-container">
              <div className="wa-poll-header">📊 Poll</div>
              {template.pollOptions.map((opt, i) => (
                <div key={i} className="wa-poll-option">
                  <div className="wa-poll-option-text">{opt.text || `Option ${i + 1}`}</div>
                  <div className="wa-poll-option-vote">0 votes</div>
                </div>
              ))}
            </div>
          )}

          {template.type === "list" && (
            <div className="wa-list-container">
              <div className="wa-list-btn">
                <span className="wa-list-icon">☰</span>
                {template.buttonText || "View Options"}
              </div>
              {template.listSections && template.listSections.length > 0 && (
                <div className="wa-list-preview">
                  {template.listSections[0].rows.slice(0, 3).map((row, i) => (
                    <div key={i} className="wa-list-row">
                      {row.title}
                    </div>
                  ))}
                  {template.listSections[0].rows.length > 3 && (
                    <div className="wa-list-more">+{template.listSections[0].rows.length - 3} more</div>
                  )}
                </div>
              )}
            </div>
          )}

          {template.type === "cta" && template.cta && (
            <div className="wa-cta-container">
              <div className="wa-cta-button">
                {template.cta.text || "Open link"}
              </div>
            </div>
          )}
        </div>
        <div className="wa-message-time">12:30 PM</div>
      </div>
    </div>
  );
}
