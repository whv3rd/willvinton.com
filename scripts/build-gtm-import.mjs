// Builds gtm/ga4-events.json: a Google Tag Manager import that forwards every analytics.js
// event to GA4. Edit EVENTS / PARAMS here when tracking changes, re-run, re-import.
//
// Usage: node scripts/build-gtm-import.mjs [G-MEASUREMENTID]
// Import: GTM > Admin > Import container > choose the file > workspace "Default" >
// Merge > "Rename conflicting tags, triggers and variables". Then Preview, then Publish.
//
// What it adds:
//   Tag      GA4 - wvTrack events      GA4 event; name = {{Event}}; one parameter per PARAMS entry
//   Trigger  CE - wvTrack events       custom event matching exactly the EVENTS names
//   Trigger  Block - automated browser exception for headless/automation browsers (navigator.webdriver)
//   Vars     wv - <param>              data layer variables reading wv.<param>
//            wv - GA4 measurement ID   constant, so the ID lives in one place
//            wv - automated browser    custom JavaScript, true in automation
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
export const MEASUREMENT_ID = (isMain && process.argv[2]) || 'G-WPLXXKH0FY';

// Every event analytics.js and the Springspot scripts send (TRACKING.md has the details).
export const EVENTS = [
  'logo_click', 'nav_click', 'footer_click', 'cta_click',
  'click', 'social_click', 'contact_click',
  'form_start', 'form_submit', 'form_error', 'form_abandon', 'generate_lead',
  'resume_download', 'file_download',
  'project_view', 'project_click',
  'scroll_depth', 'read_complete',
  'score_start', 'score_step', 'score_complete', 'score_cta_click',
  'accordion_open', 'carousel_nav', 'copy_to_clipboard',
];

// Every parameter they can carry. debug_mode is only present in debug mode.
export const PARAMS = [
  'site_section',
  'link_url', 'link_domain', 'link_text', 'outbound', 'nav_type',
  'cta_label', 'cta_location', 'network', 'contact_method',
  'form_id', 'form_name', 'field_name', 'error_type', 'lead_source',
  'file_name', 'file_extension',
  'project_name', 'project_status',
  'content_type', 'post_title', 'post_slug', 'percent_scrolled',
  'step_number', 'step_name', 'score_total', 'score_level', 'weakest_checkpoint',
  'ui_location', 'ui_action', 'ui_item',
  'debug_mode',
];

const ids = { account: '0', container: '0' };
const base = { accountId: ids.account, containerId: ids.container };
const t = (key, value) => ({ type: 'TEMPLATE', key, value });
let next = 100;
const id = () => String(next++);

const dlv = (param) => ({
  ...base,
  variableId: id(),
  name: `wv - ${param}`,
  type: 'v',
  parameter: [
    { type: 'INTEGER', key: 'dataLayerVersion', value: '2' },
    { type: 'BOOLEAN', key: 'setDefaultValue', value: 'false' },
    t('name', `wv.${param}`),
  ],
});

const variables = [
  { ...base, variableId: id(), name: 'wv - GA4 measurement ID', type: 'c', parameter: [t('value', MEASUREMENT_ID)] },
  {
    ...base,
    variableId: id(),
    name: 'wv - automated browser',
    type: 'jsm',
    parameter: [t('javascript', 'function(){try{return navigator.webdriver===true}catch(e){return false}}')],
  },
  ...PARAMS.map(dlv),
];

const fire = {
  ...base,
  triggerId: id(),
  name: 'CE - wvTrack events',
  type: 'CUSTOM_EVENT',
  customEventFilter: [
    { type: 'MATCH_REGEX', parameter: [t('arg0', '{{_event}}'), t('arg1', `^(${EVENTS.join('|')})$`)] },
  ],
};
const block = {
  ...base,
  triggerId: id(),
  name: 'Block - automated browser',
  type: 'CUSTOM_EVENT',
  customEventFilter: [{ type: 'MATCH_REGEX', parameter: [t('arg0', '{{_event}}'), t('arg1', '.*')] }],
  filter: [{ type: 'EQUALS', parameter: [t('arg0', '{{wv - automated browser}}'), t('arg1', 'true')] }],
};

const tag = {
  ...base,
  tagId: id(),
  name: 'GA4 - wvTrack events',
  type: 'gaawe',
  parameter: [
    { type: 'BOOLEAN', key: 'sendEcommerceData', value: 'false' },
    t('eventName', '{{Event}}'),
    t('measurementIdOverride', '{{wv - GA4 measurement ID}}'),
    {
      type: 'LIST',
      key: 'eventSettingsTable',
      list: PARAMS.map((p) => ({
        type: 'MAP',
        map: [t('parameter', p), t('parameterValue', `{{wv - ${p}}}`)],
      })),
    },
  ],
  firingTriggerId: [fire.triggerId],
  blockingTriggerId: [block.triggerId],
  tagFiringOption: 'ONCE_PER_EVENT',
  monitoringMetadata: { type: 'MAP' },
  consentSettings: { consentStatus: 'NOT_SET' },
};

const fingerprint = '1762819200000';
for (const item of [...variables, fire, block, tag]) item.fingerprint = fingerprint;

const container = {
  exportFormatVersion: 2,
  exportTime: '2026-11-11 00:00:00',
  containerVersion: {
    path: 'accounts/0/containers/0/versions/0',
    ...base,
    containerVersionId: '0',
    container: {
      path: 'accounts/0/containers/0',
      ...base,
      name: 'willvinton.com',
      publicId: 'GTM-W64VTKTX',
      usageContext: ['WEB'],
      fingerprint,
    },
    tag: [tag],
    trigger: [fire, block],
    variable: variables,
    builtInVariable: [{ ...base, type: 'EVENT', name: 'Event' }],
    fingerprint,
  },
};

if (isMain) {
  const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'gtm', 'ga4-events.json');
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(container, null, 2) + '\n');
  console.log(`Wrote ${out}: ${EVENTS.length} events, ${PARAMS.length} parameters, ${MEASUREMENT_ID}`);
}
