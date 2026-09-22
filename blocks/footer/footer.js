import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment (skip if aem-embed already provided content)
  if (block.textContent === '') {
    const footerMeta = getMetadata('footer');
    const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
    const fragment = await loadFragment(footerPath);

    block.textContent = '';
    const footer = document.createElement('div');
    while (fragment.firstElementChild) footer.append(fragment.firstElementChild);
    block.append(footer);
  }

  const sections = [...block.querySelectorAll('.section')];

  // Identify sections by content (robust to added link-column / newsletter rows).
  const copyrightSection = sections.find((s) => /©|copyright/i.test(s.textContent));
  const socialSection = sections.find((s) => s.querySelector('ul') && s.querySelector('.icon'));
  const columnsSection = sections.find((s) => s.querySelectorAll('.default-content-wrapper > h3, .default-content-wrapper > h2').length >= 2);

  if (columnsSection) columnsSection.classList.add('footer-columns');

  // Merge social icons into the copyright row (unchanged behaviour).
  if (copyrightSection && socialSection && copyrightSection !== socialSection) {
    const socialUl = socialSection.querySelector('ul');
    const copyrightWrapper = copyrightSection.querySelector('.default-content-wrapper');
    if (socialUl && copyrightWrapper) {
      const pipe = document.createElement('span');
      pipe.className = 'footer-separator';
      pipe.textContent = '|';
      copyrightWrapper.append(pipe, socialUl);
      socialSection.remove();
    }
  }
}
