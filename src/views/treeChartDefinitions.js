import {html} from 'lit'

import '@material/web/chips/input-chip'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/menu/menu'
import '@material/web/menu/menu-item'
import {mdiPalette} from '@mdi/js'

import '../components/GrampsjsFanChart.js'
import '../components/GrampsjsIcon.js'
import '../components/GrampsjsRelationshipChart.js'
import '../components/GrampsjsTooltip.js'
import '../components/GrampsjsTreeChart.js'
import {chartNameDisplayFormat, menuSelectionHandler} from '../util.js'

// A chart definition describes one chart of the tree view:
// - `settings`: the settings in the settings dialog. Each is stored in the
//   user settings under `key` and has a `name` in the setting values, a
//   `label`, a `type` ('number' or 'nameDisplayFormat') and a `default`.
// - `editable`: whether people can be added to the chart in edit mode.
// - `zoomable`: whether the chart has zoom and pan controls and keys.
// - `request(grampsId, values)`: the filter rules and extensions of the
//   people the chart needs.
// - `render({grampsId, values, data, canEdit, appState, state})`: the chart
//   component. `state` holds options that are not stored, such as the fan
//   chart colour.
// - `renderControls(view)`, optional: controls after the common ones.
//
// Generation settings count the generations beyond the selected person.
// Chart components and filter rules also count the selected person's
// generation.

const treeExtend = 'event_ref_list,primary_parent_family,family_list'

function treeRules(grampsId, ancestorGenerations, descendantGenerations) {
  return {
    function: 'or',
    rules: [
      {
        name: 'IsLessThanNthGenerationAncestorOf',
        values: [grampsId, ancestorGenerations],
      },
      {
        name: 'IsLessThanNthGenerationDescendantOf',
        values: [grampsId, descendantGenerations],
      },
    ],
  }
}

const nameDisplayFormatSetting = key => ({
  name: 'nameDisplayFormat',
  key,
  label: 'Name Display Format',
  type: 'nameDisplayFormat',
  default: chartNameDisplayFormat.surnameThenGiven,
})

const ancestorsSetting = (key, defaultValue) => ({
  name: 'ancestors',
  key,
  label: 'Max Ancestor Generations',
  type: 'number',
  min: 1,
  default: defaultValue,
})

const descendantsSetting = (key, defaultValue) => ({
  name: 'descendants',
  key,
  label: 'Max Descendant Generations',
  type: 'number',
  min: 0,
  default: defaultValue,
})

const fanColors = {
  nEvents: 'Number of events',
  nNotes: 'Number of notes',
  birthYear: 'Birth year',
  deathYear: 'Death year',
  age: 'Age',
  surname: 'Surname',
  religion: 'Religion',
  nPaths: 'Ancestor frequency',
}

// The colour control of the fan chart: a palette button that opens the menu of
// colours or, once a colour is chosen, a chip with that colour that opens the
// menu and can be removed
function renderFanColorControls(view) {
  const {color} = view.chartState
  const setColor = value => view.setChartState({color: value})
  const openMenu = () => {
    view.renderRoot.querySelector('#usage-menu').open = true
  }
  const control =
    color && fanColors[color]
      ? html`
          <md-input-chip
            id="btn-color"
            label="${view._(fanColors[color])}"
            @click=${openMenu}
            @remove=${e => {
              // The chip is replaced by the palette button on the next
              // render, so it does not remove itself
              e.preventDefault()
              setColor('')
            }}
          >
            <svg viewBox="0 0 24 24" slot="icon">
              <path d="${mdiPalette}" />
            </svg>
          </md-input-chip>
        `
      : html`
          <md-icon-button
            @click=${openMenu}
            aria-label="${view._('Color')}"
            id="btn-color"
          >
            <grampsjs-icon
              path="${mdiPalette}"
              color="currentColor"
            ></grampsjs-icon>
          </md-icon-button>
        `
  return html`
    ${control}
    <grampsjs-tooltip for="btn-color" .appState="${view.appState}"
      >${view._('Color')}</grampsjs-tooltip
    >
    <span style="position: relative">
      <md-menu
        id="usage-menu"
        anchor="btn-color"
        skip-restore-focus
        @close-menu=${menuSelectionHandler(item =>
          setColor(item.dataset.value)
        )}
      >
        ${Object.keys(fanColors).map(
          value => html`
            <md-menu-item data-value="${value}">
              <div slot="headline">${view._(fanColors[value])}</div>
            </md-menu-item>
          `
        )}
      </md-menu>
    </span>
  `
}

export const chartDefinitions = {
  ancestor: {
    settings: [
      ancestorsSetting('treeChartAnc', 3),
      nameDisplayFormatSetting('treeChartNameDisplayFormat'),
    ],
    editable: true,
    zoomable: true,
    request: (grampsId, {ancestors}) => ({
      rules: treeRules(grampsId, ancestors + 1, 2),
      extend: treeExtend,
    }),
    render: ({grampsId, values, data, canEdit, appState}) => html`
      <grampsjs-tree-chart
        ancestors
        grampsId=${grampsId}
        nAnc=${values.ancestors + 1}
        nDesc="2"
        nameDisplayFormat=${values.nameDisplayFormat}
        ?canEdit="${canEdit}"
        .data=${data}
        .appState="${appState}"
      >
      </grampsjs-tree-chart>
    `,
  },

  descendant: {
    settings: [
      descendantsSetting('descendantChartDesc', 1),
      nameDisplayFormatSetting('descendantChartNameDisplayFormat'),
    ],
    editable: true,
    zoomable: true,
    request: (grampsId, {descendants}) => ({
      rules: treeRules(grampsId, 2, descendants + 1),
      extend: treeExtend,
    }),
    render: ({grampsId, values, data, canEdit, appState}) => html`
      <grampsjs-tree-chart
        descendants
        grampsId=${grampsId}
        nAnc="2"
        nDesc=${values.descendants + 1}
        nameDisplayFormat=${values.nameDisplayFormat}
        ?canEdit="${canEdit}"
        .data=${data}
        gapX="60"
        .appState="${appState}"
      >
      </grampsjs-tree-chart>
    `,
  },

  hourglass: {
    settings: [
      ancestorsSetting('hourglassChartAnc', 2),
      descendantsSetting('hourglassChartDesc', 1),
      nameDisplayFormatSetting('hourglassChartNameDisplayFormat'),
    ],
    editable: true,
    zoomable: true,
    request: (grampsId, {ancestors, descendants}) => ({
      rules: treeRules(grampsId, ancestors + 1, descendants + 1),
      extend: treeExtend,
    }),
    render: ({grampsId, values, data, canEdit, appState}) => html`
      <grampsjs-tree-chart
        ancestors
        descendants
        grampsId=${grampsId}
        nAnc=${values.ancestors + 1}
        nDesc=${values.descendants + 1}
        nameDisplayFormat=${values.nameDisplayFormat}
        ?canEdit="${canEdit}"
        .data=${data}
        gapX="60"
        .appState="${appState}"
      >
      </grampsjs-tree-chart>
    `,
  },

  relationship: {
    settings: [
      {
        name: 'separation',
        key: 'relationshipChartAnc',
        label: 'Max Degree of Separation',
        type: 'number',
        min: 0,
        default: 2,
      },
      {
        name: 'maxImages',
        key: 'relationshipChartMaxImages',
        label: 'Max Number of Images displayed',
        type: 'number',
        min: 0,
        size: 5,
        default: 50,
      },
      nameDisplayFormatSetting('relationshipChartNameDisplayFormat'),
    ],
    editable: true,
    zoomable: true,
    request: (grampsId, {separation}) => ({
      rules: {
        function: 'or',
        rules: [{name: 'DegreesOfSeparation', values: [grampsId, separation]}],
      },
      // The chart also shows other parent families, such as adoptive parents
      extend: `${treeExtend},parent_family_list`,
    }),
    render: ({grampsId, values, data, canEdit}) => html`
      <grampsjs-relationship-chart
        grampsId=${grampsId}
        nMaxImages=${values.maxImages}
        nameDisplayFormat=${values.nameDisplayFormat}
        ?canEdit="${canEdit}"
        .data=${data}
      >
      </grampsjs-relationship-chart>
    `,
  },

  fan: {
    settings: [
      ancestorsSetting('fanChartAnc', 4),
      nameDisplayFormatSetting('fanChartNameDisplayFormat'),
    ],
    editable: false,
    request: (grampsId, {ancestors}) => ({
      rules: treeRules(grampsId, ancestors + 1, 2),
      extend: treeExtend,
    }),
    render: ({grampsId, values, data, appState, state}) => html`
      <grampsjs-fan-chart
        grampsId=${grampsId}
        depth=${values.ancestors + 1}
        .data=${data}
        .appState="${appState}"
        color="${state.color ?? ''}"
        nameDisplayFormat=${values.nameDisplayFormat}
      >
      </grampsjs-fan-chart>
    `,
    renderControls: renderFanColorControls,
  },
}

// Returns the values of a chart's settings by name, from the user settings or
// the defaults
export function chartSettingValues(definition, settings = {}) {
  return Object.fromEntries(
    definition.settings.map(setting => [
      setting.name,
      settings[setting.key] ?? setting.default,
    ])
  )
}

// Returns the API URL of the people a chart needs
export function chartDataUrl(definition, grampsId, values, lang) {
  const {rules, extend} = definition.request(grampsId, values)
  return `/api/people/?rules=${encodeURIComponent(
    JSON.stringify(rules)
  )}&locale=${lang || 'en'}&profile=self&extend=${extend}`
}
