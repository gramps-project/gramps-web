import {html, LitElement, css} from 'lit'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {sharedStyles} from '../SharedStyles.js'

import {fireEvent} from '../util.js'

const tesseractLanguages = {
  afr: 'Afrikaans',
  amh: 'አማርኛ',
  ara: 'العربية',
  asm: 'অসমীয়া',
  aze: 'Azərbaycanca',
  aze_cyrl: 'Азәрбајҹан',
  bel: 'Беларуская',
  ben: 'বাঙালি',
  bod: 'བོད་ཡིག',
  bos: 'Bosanski',
  bre: 'Brezhoneg',
  bul: 'Български',
  cat: 'Català',
  ceb: 'Sinugboanon',
  ces: 'Čeština',
  chi_sim: '简体中文',
  chi_tra: '繁體中文',
  chr: 'ᏣᎳᎩ',
  cos: 'Corsu',
  cym: 'Cymraeg',
  dan: 'Dansk',
  dan_frak: 'Dansk - Fraktur',
  deu: 'Deutsch',
  deu_frak: 'Deutsch - Fraktur',
  dzo: 'རྫོང་ཁ',
  ell: 'Ελληνικά',
  eng: 'English',
  enm: 'English, Middle',
  epo: 'Esperanto',
  est: 'Eesti',
  eus: 'Euskara',
  fao: 'Føroyskt',
  fas: 'فارسی',
  fil: 'Wikang Filipino',
  fin: 'Suomi',
  fra: 'Français',
  frk: 'Deutsch - Fraktur',
  frm: 'Français, Moyen',
  fry: 'Frysk',
  gla: 'Gàidhlig',
  gle: 'Gaeilge',
  glg: 'Galego',
  grc: 'Ἑλληνική',
  guj: 'ગુજરાતી',
  hat: 'Kreyòl Ayisyen',
  heb: 'עברית',
  hin: 'हिन्दी',
  hrv: 'Hrvatski',
  hun: 'Magyar',
  hye: 'Հայերեն',
  iku: 'ᐃᓄᒃᑎᑐᑦ',
  ind: 'Bahasa Indonesia',
  isl: 'Íslenska',
  ita: 'Italiano',
  ita_old: 'Italiano - Vecchio',
  jav: 'Basa Jawa',
  jpn: '日本語',
  kan: 'ಕನ್ನಡ',
  kat: 'ქართული',
  kat_old: 'ქართული - ძველი',
  kaz: 'Қазақ',
  khm: 'ភាសាខ្មែរ',
  kir: 'Кыргызча',
  kmr: 'Kurmanji',
  kor: '한국어',
  kor_vert: '한국어 (수직쓰기)',
  kur: 'كوردی',
  lao: 'ລາວ',
  lat: 'Latina',
  lav: 'Latviešu',
  lit: 'Lietuvių',
  ltz: 'Lëtzebuergesch',
  mal: 'മലയാളം',
  mar: 'मराठी',
  mkd: 'Македонски',
  mlt: 'Malti',
  mon: 'Монгол',
  mri: 'Te Reo Māori',
  msa: 'Bahasa Malaysia',
  mya: 'ဗမာ',
  nep: 'नेपाली',
  nld: 'Nederlands',
  nor: 'Norsk',
  oci: 'Occitan',
  ori: 'ଓଡ଼ିଆ',
  pan: 'ਪੰਜਾਬੀ',
  pol: 'Polski',
  por: 'Português',
  pus: 'پښتو',
  que: 'Runasimi',
  ron: 'Română',
  rus: 'Русский',
  san: 'संस्कृतम्',
  sin: 'සිංහල',
  slk: 'Slovenčina',
  slk_frak: 'Slovenčina - Fraktur',
  slv: 'Slovenščina',
  snd: 'سنڌي',
  spa: 'Español',
  spa_old: 'Español - Antiguo',
  sqi: 'Shqip',
  srp: 'Српски',
  srp_latn: 'Srpski - Latinica',
  sun: 'Basa Sunda',
  swa: 'Kiswahili',
  swe: 'Svenska',
  syr: 'ܣܘܪܝ',
  tam: 'தமிழ்',
  tat: 'Татар',
  tel: 'తెలుగు',
  tgk: 'Тоҷикӣ',
  tgl: 'Filipino',
  tha: 'ภาษาไทย',
  tir: 'ትግርኛ',
  ton: 'lea faka-Tonga',
  tur: 'Türkçe',
  uig: 'ئۇيغۇرچە',
  ukr: 'Українська',
  urd: 'اردو',
  uzb: 'Oʻzbek',
  uzb_cyrl: 'Ўзбек',
  vie: 'Tiếng Việt',
  yid: 'ייִדיש',
  yor: 'Yorùbá',
}

// Gramps to tesseract language codes
const langMapping = {
  ar: 'ara',
  bg: 'bul',
  br: 'bre',
  ca: 'cat',
  cs: 'ces',
  da: 'dan',
  de_AT: 'deu',
  de: 'deu',
  el: 'ell',
  en_GB: 'eng',
  en: 'eng',
  eo: 'epo',
  es: 'spa',
  fi: 'fin',
  fr: 'fra',
  ga: 'gle',
  he: 'heb',
  hr: 'hrv',
  hu: 'hun',
  is: 'isl',
  it: 'ita',
  ja: 'jpn',
  lt: 'lit',
  lv: 'lav',
  mk: 'mkd',
  nb: 'nor',
  nl: 'nld',
  nn: 'nld',
  pl: 'pol',
  pt_BR: 'por',
  pt_PT: 'por',
  ro: 'ron',
  ru: 'rus',
  sk: 'slk',
  sl: 'slv',
  sq: 'sqi',
  sr: 'srp',
  sv: 'swe',
  ta: 'tam',
  tr: 'tur',
  uk: 'ukr',
  vi: 'vie',
  zh_CN: 'chi_sim',
  zh_HK: 'chi_tra',
  zh_TW: 'chi_tra',
}

export class GrampsjsTextRecognition extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .result {
          font-family: var(
            --grampsjs-note-font-family,
            var(--grampsjs-body-font-family)
          );
          font-size: var(--grampsjs-note-font-size, 17px);
          line-height: var(--grampsjs-note-line-height, 1.5em);
          color: var(--grampsjs-note-color);
          white-space: pre-wrap;
        }
      `,
    ]
  }

  static get properties() {
    return {
      handle: {type: String},
      options: {type: Object},
      languages: {type: Array},
      _string: {type: String},
    }
  }

  constructor() {
    super()
    this.options = {}
    this.handle = ''
    this.languages = []
    this._string = ''
  }

  render() {
    return html`
      <p>
        <mwc-select
          outlined
          label="${this._('Language')}"
          @change="${this._handleLangChange}"
        >
          ${this.languages.map(
            lang => html`
              <mwc-list-item
                value="${lang}"
                ?selected=${lang === this.options.lang}
                >${tesseractLanguages[lang] || lang}</mwc-list-item
              >
            `
          )}
        </mwc-select>
      </p>
      <p>
        <mwc-button
          raised
          @click="${this._handleRun}"
          ?disabled="${this._isDisabled()}"
          >${this._('Run')}</mwc-button
        >
        <grampsjs-task-progress-indicator
          id="indicator-ocr"
          taskName="runOcr"
          class="button"
          size="20"
          hideAfter="10"
          @task:complete="${this._handleTaskComplete}"
        ></grampsjs-task-progress-indicator>
      </p>
      <p class="result">${this._string ?? ''}</p>
      ${this._string && this.appState.permissions.canEdit
        ? html`
            <p>
              <mwc-button raised @click="${this._handleSaveAsNote}"
                >${this._('Save as Note')}</mwc-button
              >
            </p>
          `
        : ''}
    `
  }

  firstUpdated() {
    this._setLangInitial()
  }

  _setLangInitial() {
    const locale = this.appState.i18n.lang ?? ''
    if (!locale) {
      return
    }
    const lang = langMapping[locale] ?? ''
    if (!lang) {
      return
    }
    this.options = {...this.options, lang}
  }

  _isDisabled() {
    return !(this.options.lang && this.handle)
  }

  _handleLangChange(e) {
    this.options = {...this.options, lang: e.target.value}
  }

  async _handleRun() {
    const prog = this.renderRoot.querySelector('#indicator-ocr')
    prog.reset()
    prog.open = true
    const queryParam = new URLSearchParams(this.options).toString()
    const url = `/api/media/${this.handle}/ocr?${queryParam}`
    const data = await this.appState.apiPost(url)
    if ('error' in data) {
      prog.setError()
      prog.errorMessage = data.error
    } else if ('task' in data) {
      // queued task
      prog.taskId = data.task?.id || ''
    } else {
      // eagerly executed task
      this._string = data.data || ''
      prog.setComplete()
    }
  }

  _handleTaskComplete(e) {
    const {status} = e.detail
    const result = JSON.parse(status.result || {})
    this._string = result || ''
  }

  async _handleSaveAsNote() {
    const note = {
      _class: 'Note',
      type: 'Transcript',
      text: {_class: 'StyledText', string: this._string},
    }
    const data = await this.appState.apiPost('/api/notes/', note)
    if ('error' in data) {
      fireEvent(this, 'grampsjs:error', {message: data.error})
    } else {
      const [txn] = data.data
      const gid = txn?.new?.gramps_id
      const handle = txn?.handle
      if (gid && handle) {
        fireEvent(this, 'edit:action', {
          action: 'addNoteRef',
          data: {data: [handle]},
        })
      }
    }
  }
}

window.customElements.define(
  'grampsjs-text-recognition',
  GrampsjsTextRecognition
)
