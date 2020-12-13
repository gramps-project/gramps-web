import {html} from 'lit-html'
import '../src/components/GrampsjsRectContainer.js'
import '../src/components/GrampsjsRect.js'

const rect1 = [10, 10, 20, 20]
const rect2 = [80, 80, 90, 90]

export default {
  title: 'grampsjs-rect',
}
export const App = () =>
  html`
  <grampsjs-rect-container>
    <div style="width:500px;height:300px;background-color:rgba(255, 0, 0, 0.2)"></div>
    <grampsjs-rect .rect="${rect1}" label="some label 1" target="some/target1"></grampsjs-rect>
    <grampsjs-rect .rect="${rect2}" label="some label 2" target="some/target2"></grampsjs-rect>
  </grampsjs-rect-container>
  `
