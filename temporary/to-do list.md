# To-Do List: Voucher (Receipt) Design Updates

- [x] Increase logo size in PDF Receipt from 28x28mm to 36x36mm.
- [x] Adjust header positions and spacing to align with the larger logo.
- [x] Relocate the summary block (Tuition Paid, Exam Fee Paid, Grand Total, etc.) to flow directly under the payment transaction table (at `finalY + 5`).
- [x] Position the signature block and contact footer dynamically at the bottom of the page (`Math.max(summaryEndY + 12, 235)`).
- [x] Increase logo size in PDF Receipt from 36x36mm to 45x45mm.
- [x] Remove "NiT College" header text.
- [x] Make "Payment Receipt" the main header text, styled bold, size 18, vertically centered relative to the logo.
- [x] Adjust header layout variables (`headerX`, divider line Y position, and `contentY`) to accommodate the larger 45x45mm logo.
- [x] Center the logo horizontally on the PDF page (`x = 82.5`).
- [x] Position the "Payment Receipt" title directly under the logo, horizontally centered (`x = 105`, `{ align: "center" }`).
- [x] Adjust the divider line and student info layout (`contentY`) relative to the new centered header height.
- [x] Increase logo size further to 50x50mm.
- [x] Keep "Payment Receipt" text size at 12pt (styled bold for emphasis) rather than making it larger.


