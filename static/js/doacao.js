document.addEventListener('DOMContentLoaded', () => {
  const pixInfo = document.getElementById('pix-info');
  const volunteerInfo = document.getElementById('volunteer-info');
  const foodDonationInfo = document.getElementById('food-donation-info');

  if (pixInfo) pixInfo.classList.add('d-none');
  if (volunteerInfo) volunteerInfo.classList.add('d-none');
  if (foodDonationInfo) foodDonationInfo.classList.add('d-none');
});

function handleOptionChange(selectElement) {
  const selectedValue = selectElement.value;
  const pixInfo = document.getElementById('pix-info');
  const volunteerInfo = document.getElementById('volunteer-info');
  const foodDonationInfo = document.getElementById('food-donation-info');

  if (pixInfo && volunteerInfo && foodDonationInfo) {
    pixInfo.classList.add('d-none');
    volunteerInfo.classList.add('d-none');
    foodDonationInfo.classList.add('d-none');

    if (selectedValue === "1") {
      pixInfo.classList.remove('d-none');
    } else if (selectedValue === "2") {
      volunteerInfo.classList.remove('d-none');
    } else if (selectedValue === "3") {
      foodDonationInfo.classList.remove('d-none');
    }
  }
}

function mostrarOutroItem(valor) {
  const outroItemDiv = document.getElementById('outroItemDiv');
  if (valor === 'outro') {
    outroItemDiv.style.display = 'block';
  } else {
    outroItemDiv.style.display = 'none';
    document.getElementById('outro_item_descricao').value = '';
  }
}
