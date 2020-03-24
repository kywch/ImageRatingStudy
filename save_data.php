<?php
date_default_timezone_set('America/Chicago');

//header('Access-Control-Allow-Origin: https://ssd.az1.qualtrics.com');
header('Access-Control-Allow-Origin: *');

//include_once './sanitize.inc.php';
// filtering acts somewhat strange to the data, so grab the data first
if (isset($_POST['sess_data']) == false) { exit; }
// sess_data should be compressed json
//$data = decompress_json( $_POST['sess_data'] );
//$data = json_decode($_POST['sess_data']);
$data = $_POST['sess_data'];

/* prevent XSS. */
$_POST = filter_input_array(INPUT_POST, FILTER_SANITIZE_STRING);

if (isset($_POST['data_dir']) == true)
{
    $data_dir = $_POST['data_dir']; // data directory
} else { exit; }
if (isset($_POST['task_id']) == true)
{
    $task_id = $_POST['task_id']; // sequence_id
} else { exit; }    
if (isset($_POST['sbj_id']) == true)
{
    $sbj_id = $_POST['sbj_id']; // mturk_id
} else { exit; }

// the $_POST[] array will contain the passed in filename and data
$today = date("ymd");
$filename = $data_dir . '/' . $task_id . '_' . $sbj_id . '_' . $today . '.json';

// first, write the file to disk in the tmp directory
// check how large is that tmp file
//file_put_contents($filename, json_encode( $data, JSON_PRETTY_PRINT ) );
file_put_contents($filename, $data);

//var_dump( $data );
exit;
?>
