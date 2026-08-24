import jsPDF from 'jspdf';
import { domToPng } from 'modern-screenshot';

/**
 * Generate PDF by capturing actual screenshots of the rendered components
 * This provides pixel-perfect reproduction of the UI in the PDF
 */
export const generatePortfolioScreenshotPDF = async (portfolioName) => {
  let addedElements = []; // Track elements we add so we can clean up
  
  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 10;
    const contentWidth = pageWidth - (2 * margin);
    
    // Find the container
    let resultsContainer = document.getElementById('portfolio-pdf-content');
    
    if (!resultsContainer) {
      resultsContainer = document.querySelector('.flex-1.overflow-y-auto.bg-gray-50');
    }
    
    if (!resultsContainer) {
      throw new Error('Could not find portfolio content container');
    }
    
    // PRE-PROCESS: Create inline date text at the top and hide original inputs
    const dateInputs = resultsContainer.querySelectorAll('input[type="date"]');
    const dateTexts = [];
    
    dateInputs.forEach((input) => {
      if (input.value) {
        const parentDiv = input.closest('.flex.items-center.gap-2');
        if (parentDiv) {
          const label = parentDiv.querySelector('label');
          const labelText = label ? label.textContent.trim() : '';
          dateTexts.push(`${labelText}: ${input.value}`);
          
          // Hide the entire parent div
          const originalDisplay = parentDiv.style.display;
          parentDiv.style.display = 'none';
          
          addedElements.push({ parentDiv, originalDisplay });
        }
      }
    });
    
    // Create single inline text for all dates at the top
    if (dateTexts.length > 0) {
      const dateContainer = resultsContainer.querySelector('.flex.items-center.gap-6.flex-wrap');
      if (dateContainer && dateContainer.parentNode) {
        const inlineDateText = document.createElement('div');
        inlineDateText.textContent = dateTexts.join('  |  ');
        inlineDateText.className = 'pdf-inline-dates';
        inlineDateText.style.cssText = `
          font-size: 14px;
          color: rgb(55, 65, 81);
          font-weight: 500;
          margin-bottom: 12px;
          padding: 8px 0;
          white-space: nowrap;
          overflow: visible;
        `;
        
        // Insert at the top of the parent container
        const grandParent = dateContainer.parentNode;
        grandParent.insertBefore(inlineDateText, dateContainer);
        
        addedElements.push({ replacement: inlineDateText });
      }
    }
    
    const selects = resultsContainer.querySelectorAll('select');
    selects.forEach((select) => {
      const selectedOption = select.options[select.selectedIndex];
      if (selectedOption && selectedOption.textContent) {
        const replacement = document.createElement('span');
        replacement.textContent = selectedOption.textContent.trim();
        replacement.className = 'pdf-select-text';
        replacement.style.cssText = `
          font-size: 14px;
          color: rgb(55, 65, 81);
          padding: 8px 12px;
          border: 1px solid rgb(209, 213, 219);
          border-radius: 6px;
          background-color: rgb(255, 255, 255);
          display: inline-block;
        `;
        
        const originalDisplay = select.style.display;
        select.style.display = 'none';
        select.parentNode.insertBefore(replacement, select);
        
        addedElements.push({ replacement, select, originalDisplay });
      }
    });
    
    // Small delay to ensure DOM updates are rendered
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Add temporary class
    resultsContainer.classList.add('generating-pdf');
    
    // Get dimensions
    const containerWidth = resultsContainer.scrollWidth;
    const containerHeight = resultsContainer.scrollHeight;

    // Capture with modern-screenshot
    const dataUrl = await domToPng(resultsContainer, {
      quality: 1,
      scale: 2,
      width: containerWidth,
      height: containerHeight,
      backgroundColor: '#f9fafb',
      filter: (node) => {
        if (node.tagName === 'BUTTON') {
          const buttonText = node.textContent?.toLowerCase() || '';
          if (buttonText.includes('delete') || 
              buttonText.includes('apply') || 
              buttonText.includes('zoom') ||
              buttonText.includes('screenshot') ||
              node.classList?.contains('ignore-pdf')) {
            return false;
          }
        }
        if (node.classList?.contains('ignore-pdf')) {
          return false;
        }
        return true;
      }
    });

    // CLEANUP: Remove replacements and restore originals
    addedElements.forEach(({ replacement, input, select, parentDiv, originalDisplay }) => {
      if (replacement && replacement.parentNode) {
        replacement.parentNode.removeChild(replacement);
      }
      if (input) {
        input.style.display = originalDisplay || '';
      }
      if (select) {
        select.style.display = originalDisplay || '';
      }
      if (parentDiv) {
        parentDiv.style.display = originalDisplay || '';
      }
    });
    addedElements = [];
    
    // Remove temporary class
    resultsContainer.classList.remove('generating-pdf');

    // Create image
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = dataUrl;
    });

    // Calculate PDF dimensions
    const imgWidth = contentWidth;
    const imgHeight = (img.height * imgWidth) / img.width;
    const pageContentHeight = pageHeight - (2 * margin);

    // Single or multi-page
    if (imgHeight <= pageContentHeight) {
      doc.addImage(dataUrl, 'PNG', margin, margin, imgWidth, imgHeight);
    } else {
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      let currentYMM = 0;
      let pageNum = 0;
      const pixelsPerMM = img.width / imgWidth;
      const minSliceHeight = 50;

      while (currentYMM < imgHeight) {
        if (pageNum > 0) {
          doc.addPage();
        }

        const remainingHeightMM = imgHeight - currentYMM;
        let sliceHeightMM = Math.min(pageContentHeight, remainingHeightMM);
        
        if (remainingHeightMM > pageContentHeight && 
            remainingHeightMM < pageContentHeight + minSliceHeight) {
          sliceHeightMM = pageContentHeight - 20;
        }
        
        const sourceYPx = currentYMM * pixelsPerMM;
        const sliceHeightPx = sliceHeightMM * pixelsPerMM;

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = Math.ceil(Math.min(sliceHeightPx, canvas.height - sourceYPx));
        
        const sliceCtx = sliceCanvas.getContext('2d');
        sliceCtx.drawImage(
          canvas,
          0, Math.floor(sourceYPx),
          canvas.width, sliceCanvas.height,
          0, 0,
          canvas.width, sliceCanvas.height
        );

        const sliceImgData = sliceCanvas.toDataURL('image/png', 1.0);
        doc.addImage(sliceImgData, 'PNG', margin, margin, imgWidth, sliceHeightMM);

        currentYMM += sliceHeightMM;
        pageNum++;

        if (pageNum > 100) {
          break;
        }
      }
    }

    const timestamp = new Date().toLocaleString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).replace(/[/: ]/g, '-');

    const filename = `backtest-portfolio-${portfolioName.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.pdf`;
    doc.save(filename);

    return filename;
  } catch (error) {
    // Cleanup on error
    addedElements.forEach(({ replacement, input, select, parentDiv, originalDisplay }) => {
      if (replacement && replacement.parentNode) {
        replacement.parentNode.removeChild(replacement);
      }
      if (input) {
        input.style.display = originalDisplay || '';
      }
      if (select) {
        select.style.display = originalDisplay || '';
      }
      if (parentDiv) {
        parentDiv.style.display = originalDisplay || '';
      }
    });
    
    const container = document.getElementById('portfolio-pdf-content');
    if (container) {
      container.classList.remove('generating-pdf');
    }
    throw error;
  }
};

/**
 * Generate PDF by capturing specific sections separately for better control
 */
export const generatePortfolioScreenshotPDFBySection = async (portfolioName) => {
  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 10;
    const contentWidth = pageWidth - (2 * margin);
    let yPos = margin;
    let isFirstSection = true;

    const sections = [
      { selector: '.portfolio-settings', name: 'Portfolio Settings' },
      { selector: '.backtest-result-header', name: 'Backtest Header' },
      { selector: '.cumulative-chart-container', name: 'Cumulative P&L Chart' },
      { selector: '.drawdown-chart-container', name: 'Drawdown Chart' },
      { selector: '.yearwise-returns', name: 'Year-wise Returns' },
      { selector: '.strategy-report', name: 'Strategy-wise Report' },
      { selector: '.full-report-table', name: 'Full Report' },
    ];

    for (const section of sections) {
      const element = document.querySelector(section.selector);
      
      if (!element) {
        console.warn(`Section not found: ${section.name}`);
        continue;
      }

      // Use modern-screenshot
      const dataUrl = await domToPng(element, {
        quality: 1,
        scale: 2,
        backgroundColor: '#ffffff'
      });

      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = dataUrl;
      });

      const imgWidth = contentWidth;
      const imgHeight = (img.height * imgWidth) / img.width;

      if (!isFirstSection && yPos + imgHeight > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
      }

      if (!isFirstSection) {
        yPos += 5;
      }

      doc.addImage(dataUrl, 'PNG', margin, yPos, imgWidth, imgHeight);
      yPos += imgHeight;
      isFirstSection = false;
    }

    const timestamp = new Date().toLocaleString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).replace(/[/: ]/g, '-');

    const filename = `backtest-portfolio-${portfolioName.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.pdf`;
    doc.save(filename);

    return filename;
  } catch (error) {
    console.error('Error generating PDF by section:', error);
    throw error;
  }
};
