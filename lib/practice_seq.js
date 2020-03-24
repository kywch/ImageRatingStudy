var num_prac_trial = 6;

/* 
    72 images were prepared to form six trials
    images prac01 - prac66: main
    images prac67 - prac72: attention checks
*/

const range = (start, numEle) => [...Array(numEle)].map((_, ii) => start + ii)

function shuffle(array) {
    let counter = array.length;
    // While there are elements in the array
    while (counter > 0) {
        // Pick a random index
        let index = Math.floor(Math.random() * counter);
        // Decrease counter by 1
        counter--;
        // And swap the last element with it
        let temp = array[counter];
        array[counter] = array[index];
        array[index] = temp;
    }
    return array;
}

Array.prototype.reshape = function (rows, cols) {
    var copy = this.slice(0); // Copy all elements.
    this.length = 0; // Clear out existing array.

    for (var r = 0; r < rows; r++) {
        var row = [];
        for (var c = 0; c < cols; c++) {
            var i = r * cols + c;
            if (i < copy.length) {
                row.push(copy[i]);
            }
        }
        this.push(row);
    }
};

function transpose(matrix) {
    return matrix[0].map((col, i) => matrix.map(row => row[i]));
}

/* prepare fully randomized image sequence */
var prac_img_seq = shuffle(range(1, 66)).concat(shuffle(range(67, 6)));
prac_img_seq.reshape(12, num_prac_trial);
prac_img_seq = transpose(prac_img_seq);

/* turning the sequence into trial-defining structure */
var prac_seq = [];
for (var ii = 0; ii < num_prac_trial; ii++) {
    var trial_seq = shuffle(prac_img_seq[ii]);
    var attn_idx = Math.max(...trial_seq);
    trial_seq.reshape(3, 4);
    prac_seq.push({
        'image_array': trial_seq.map(row => row.map(el => 'prac' + el.toString().padStart(2, '0'))),
        'attention_check': 'prac' + attn_idx.toString().padStart(2, '0')
    })
}


var prac_seq2 = [];
